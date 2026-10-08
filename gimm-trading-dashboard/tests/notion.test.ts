import test from 'node:test';
import assert from 'node:assert/strict';
import { mapNotionTrade,fetchAllNotionTrades } from '../lib/notion.ts';
import type { NotionPage } from '../lib/notion.ts';
const page=(id:string):NotionPage=>({object:'page',id,last_edited_time:'2026-10-08T11:00:00.000Z',properties:{
  'Trade ID':{title:[{plain_text:id}]},
  'Net €':{number:-151.69},'Account Balance':{number:2576.83},
  'Account':{multi_select:[{name:'Forwardtesting'}]},'Setup':{multi_select:[{name:'LTF Reversal'}]},
  'DXY':{checkbox:true},'Liquidity Sweep':{checkbox:false},'Time':{date:{start:'2026-09-04T13:30:00.000+02:00'}},
}});
test('Notion mapping preserves specified money values, booleans, timezone and nulls',()=>{
 const t=mapNotionTrade(page('105'));
 assert.equal(t.netEur,-151.69);assert.equal(t.accountBalance,2576.83);assert.equal(t.tradeNumber,105);
 assert.equal(t.dateTime,'2026-09-04T11:30:00.000Z');assert.equal(t.dxy,true);assert.equal(t.liquiditySweep,false);
 assert.equal(t.rMultiple,null);
});
test('Notion pagination reads every page and passes version header; no writes',async()=>{
 const calls:{url:string;init:RequestInit}[]=[];
 const fake=(async (url:string|URL|Request,init?:RequestInit)=>{
  calls.push({url:String(url),init:init!});
  const body=JSON.parse(String(init?.body));
  return {ok:true,status:200,json:async()=>({object:'list',results:[page(body.start_cursor?'112':'105')],has_more:!body.start_cursor,next_cursor:body.start_cursor?null:'CURSOR-2'})} as Response;
 }) as typeof fetch;
 const t=await fetchAllNotionTrades({token:'not-a-real-key',dataSourceId:'abc',version:'2025-09-03'},fake);
 assert.deepEqual(t.map(x=>x.tradeId),['105','112']);
 assert.equal(calls.length,2);assert.equal(calls[0].init.method,'POST');
 assert.equal((calls[0].init.headers as Record<string,string>)['Notion-Version'],'2025-09-03');
 assert.equal(calls[1].url,'https://api.notion.com/v1/data_sources/abc/query');
});
test('Notion mapping refuses a local timestamp with no offset',()=>{
 const p=page('109');p.properties.Time!.date={start:'2026-09-04T10:00:00'};
 assert.throws(()=>mapNotionTrade(p),/without offset/);
});
