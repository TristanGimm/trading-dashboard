import type { Trade } from './types';

export type NotionRichText = {plain_text?:string; text?:{content?:string}};
export type NotionProperty = {
  type?: string; title?:NotionRichText[]; number?:number|null; select?:{name:string}|null;
  multi_select?:{name:string}[]; checkbox?:boolean;
  date?:{start:string;end?:string|null;time_zone?:string|null}|null;
};
export type NotionPage = {object:'page';id:string;created_time?:string;last_edited_time?:string;archived?:boolean;in_trash?:boolean;properties:Record<string,NotionProperty>};
export type NotionResult = {object:'list';results:NotionPage[];has_more:boolean;next_cursor:string|null};

const props=(p:NotionPage,name:string)=>p.properties?.[name];
const multi=(p:NotionPage,name:string)=>props(p,name)?.multi_select?.map(v=>v.name)||[];
const select=(p:NotionPage,name:string)=>props(p,name)?.select?.name||null;
const num=(p:NotionPage,name:string)=>{const n=props(p,name)?.number;return typeof n==='number'&&Number.isFinite(n)?n:null;};
const yes=(p:NotionPage,name:string)=>props(p,name)?.checkbox===true;
const string=(p:NotionPage,name:string)=>props(p,name)?.title?.map(s=>s.plain_text??s.text?.content??'').join('')||'';

/** Return ISO timestamps only when Notion supplied an unambiguous instant. Date-only values default to UTC midnight. */
function notionTime(p:NotionPage):string|null {
  const d=props(p,'Time')?.date;
  if(!d?.start)return null;
  if(/^\d{4}-\d{2}-\d{2}$/.test(d.start))return d.start+'T00:00:00Z';
  if(/[zZ]|[+-]\d{2}:?\d{2}$/.test(d.start))return new Date(d.start).toISOString();
  // Notion may supply a local date-time with its own time_zone. Do not assume UTC silently.
  throw new Error(`Time without offset in Notion page ${p.id}: ${d.start}`);
}
export function mapNotionTrade(page:NotionPage):Trade {
  const tradeId=string(page,'Trade ID');
  const tradeNumber=/^\d+$/.test(tradeId)?Number(tradeId):null;
  return {
    id:page.id,tradeId,tradeNumber,account:multi(page,'Account'),dateTime:notionTime(page),day:select(page,'Day'),
    pair:select(page,'Pair'),position:select(page,'Position'),netEur:num(page,'Net €'),accountBalance:num(page,'Account Balance'),rMultiple:num(page,'R'),
    setup:multi(page,'Setup'),tfType:multi(page,'TF Type'),algorithm:multi(page,'Algorithm'),sessionTime:multi(page,'Session Time'),
    liquiditySweep:yes(page,'Liquidity Sweep'),dxy:yes(page,'DXY'),delta:yes(page,'Delta'),fractalShift:yes(page,'Fractal Shift'),
    lastEditedTime:page.last_edited_time||null,
  };
}
function sleep(ms:number){return new Promise<void>(resolve=>setTimeout(resolve,ms));}
export async function fetchAllNotionTrades(config:{token:string;dataSourceId:string;version?:string}, fetcher:typeof fetch=fetch):Promise<Trade[]> {
  if(!config.token||!config.dataSourceId)throw new Error('NOTION_TOKEN and NOTION_DATA_SOURCE_ID are required');
  const url=`https://api.notion.com/v1/data_sources/${encodeURIComponent(config.dataSourceId)}/query`;
  const found:Trade[]=[];let cursor:string|undefined;const seenCursors=new Set<string>();
  do {
    const body:Record<string,unknown>={page_size:100};if(cursor)body.start_cursor=cursor;
    let response:Response|undefined;
    for(let attempt=0;attempt<6;attempt++){
      try { response=await fetcher(url,{method:'POST',headers:{'Authorization':`Bearer ${config.token}`,'Notion-Version':config.version||'2025-09-03','Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)}); }
      catch(err){if(attempt===5)throw err;await sleep(Math.min(1000*2**attempt,15000));continue;}
      if((response.status===429||response.status>=500)&&attempt<5){const delay=response.headers.get('Retry-After');await sleep(delay?Math.min(60000,Math.max(1000,Number(delay)*1000||2000)):Math.min(1000*2**attempt,15000));continue;}
      break;
    }
    if(!response)throw new Error('No Notion response');
    if(!response.ok){const detail=(await response.text()).slice(0,300);throw new Error(`Notion API HTTP ${response.status}: ${detail}`);}
    const data=await response.json() as NotionResult;
    if(!Array.isArray(data.results)||typeof data.has_more!=='boolean')throw new Error('Malformed Notion API response');
    for(const item of data.results){if(item.object==='page'&&!item.archived&&!item.in_trash)found.push(mapNotionTrade(item));}
    if(data.has_more&&!data.next_cursor)throw new Error('Notion response has_more but no next_cursor');
    cursor=data.next_cursor??undefined;
    if(cursor){if(seenCursors.has(cursor))throw new Error('Repeated Notion pagination cursor');seenCursors.add(cursor);}
  }while(cursor);
  const unique=new Set(found.map(x=>x.id));if(unique.size!==found.length)throw new Error('Duplicate Notion page IDs');
  return found;
}
