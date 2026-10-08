import { getPool } from '../lib/db';
import { syncNotion, markSyncError } from '../lib/sync';

const once=process.argv.includes('--once');
const interval=Number(process.env.SYNC_INTERVAL_SECONDS||180);
if(!Number.isFinite(interval)||interval<60)throw new Error('SYNC_INTERVAL_SECONDS must be >= 60');
let stopping=false;
async function wait(ms:number){return new Promise<void>(resolve=>setTimeout(resolve,ms));}
async function run(){
  try {const result=await syncNotion();console.info(JSON.stringify({time:new Date().toISOString(),message:'Notion synced',...result}));}
  catch(e){console.error('Notion sync failed:',e);await markSyncError(e);if(once)process.exitCode=1;}
}
for(const signal of ['SIGTERM','SIGINT'] as const){process.on(signal,()=>{stopping=true;});}
async function main(){
  do {await run();if(once)break;for(let i=0;i<interval&&!stopping;i++)await wait(1000);}while(!stopping);
  await getPool().end();
}
main().catch(e=>{console.error(e);process.exit(1);});
