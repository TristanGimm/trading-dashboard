import { calculatePerformance, filterTrades } from '@/lib/analytics';
import { getSyncStatus, listTrades } from '@/lib/db';
import { Dashboard } from '@/components/dashboard';
import type { DashboardPayload, Trade } from '@/lib/types';
export const dynamic='force-dynamic';
export default async function Home({searchParams}:{searchParams:Promise<{period?:string;account?:string}>}){
  const query=await searchParams;
  const account=['Forwardtesting','Backtest','all'].includes(query.account||'')?query.account!:'Forwardtesting';
  const period=['all','30d','90d','365d'].includes(query.period||'')?query.period!:'all';
  let trades:Trade[]=[];let status:DashboardPayload['status']=null;let loadError:string|null=null;
  try{[trades,status]=await Promise.all([listTrades(),getSyncStatus()]);}catch{loadError='Database not initialized yet. Start the sync worker and check the container logs.';}
  const selected=filterTrades(trades,account,period);
  const payload:DashboardPayload={performance:calculatePerformance(selected,process.env.DASHBOARD_TIMEZONE||'Europe/Berlin'),trades:[...selected].sort((a,b)=>(b.dateTime?Date.parse(b.dateTime):0)-(a.dateTime?Date.parse(a.dateTime):0)).slice(0,15),status,lastTradeDate:selected.filter(x=>x.dateTime).sort((a,b)=>b.dateTime!.localeCompare(a.dateTime!))[0]?.dateTime||null,selectedAccount:account,selectedPeriod:period};
  return <Dashboard data={payload} loadError={loadError}/>;
}
