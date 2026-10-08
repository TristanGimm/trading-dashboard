'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EChartsOption } from 'echarts';
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, ChevronDown,
  CircleHelp, Clock3, Database, ExternalLink, Gauge, LayoutDashboard, RefreshCw,
  ShieldCheck, SlidersHorizontal, Sparkles, Target, TrendingUp, Zap
} from 'lucide-react';
import type { Comparison, DashboardPayload, TimePerformance } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EquityChart } from '@/components/charts/equity-chart';
import { EChart } from '@/components/charts/echart';

type Metric='avgPnl'|'winRate'|'count';
const chartColors={profit:'#34d5a4',loss:'#ff6688',blue:'#6d9eff',purple:'#9b8cff',muted:'#8392ad',grid:'rgba(154,171,200,.095)',axis:'#8190a8'};
const money=(v:number)=>new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2}).format(v);
const number=(v:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(v);
const rate=(v:number)=>`${v.toFixed(1)}%`;
const safe=(t:string)=>t.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
const fill=(g:TimePerformance)=>g.avgPnl>=0?chartColors.profit:chartColors.loss;
const tooltipStyle={backgroundColor:'#141e31',borderColor:'#2c3a51',textStyle:{color:'#eef3fc'},extraCssText:'border-radius:12px;box-shadow:0 12px 36px rgba(0,0,0,.38);padding:12px'};
const axisLine={lineStyle:{color:'#273348'}};
function palette(n:number){return n>=0?chartColors.profit:chartColors.loss;}

function Section({id,eyebrow,title,description,children,aside}:{id:string;eyebrow:string;title:string;description:string;children:React.ReactNode;aside?:React.ReactNode}){
 return <section id={id} className="scroll-mt-8 space-y-5">
  <div className="flex flex-wrap items-end justify-between gap-3">
   <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-[.21em] text-violet-400">{eyebrow}</p><h2 className="text-[23px] font-semibold tracking-tight text-slate-100 sm:text-[26px]">{title}</h2><p className="mt-1 text-sm text-slate-400">{description}</p></div>{aside}
  </div>{children}
 </section>;
}
function ChartCard({title,subtitle,children,footer,className}:{title:string;subtitle:string;children:React.ReactNode;footer?:string;className?:string}){
 return <Card className={cn('overflow-hidden',className)}><div className="flex flex-wrap items-start justify-between gap-2 px-5 pt-5 sm:px-6"><div><h3 className="text-[15px] font-semibold tracking-tight text-slate-100">{title}</h3><p className="mt-1 max-w-[680px] text-xs leading-5 text-slate-400">{subtitle}</p></div><span className="rounded-lg bg-white/[.035] p-2 text-slate-500"><BarChart3 size={16}/></span></div><div className="px-2 pb-2 pt-3 sm:px-3">{children}</div>{footer&&<div className="border-t border-white/[.07] px-5 py-3 text-xs text-slate-500 sm:px-6">{footer}</div>}</Card>;
}
function Stat({label,value,description,negative=false,tone='neutral',icon}:{label:string;value:string;description:string;negative?:boolean;tone?:'neutral'|'blue'|'green';icon:React.ReactNode}){
 return <Card className={cn('group relative min-h-36 overflow-hidden p-5 inner-border transition-colors hover:border-white/[.15] sm:p-6',tone==='blue'&&'bg-[linear-gradient(135deg,#1c2544,#11192d)]',tone==='green'&&'bg-[linear-gradient(135deg,#142b2c,#111b29)]')}>
   <div className="absolute -right-10 -top-14 h-40 w-40 rounded-full bg-violet-400/[.06] blur-3xl"/>
   <div className="relative flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-[.14em] text-slate-400">{label}</span><span className="rounded-xl border border-white/[.045] bg-white/[.045] p-2 text-slate-400">{icon}</span></div>
   <div className={cn('relative mt-5 text-[25px] font-semibold tabular-nums tracking-[-.035em] sm:text-[31px]',negative?'text-rose-400':'text-slate-50')}>{value}</div>
   <div className="relative mt-2 text-[11px] text-slate-500">{description}</div>
 </Card>;
}
function chartOptionBars(items:Comparison[],metric:Metric):EChartsOption {
 const metricName:Record<Metric,string>={avgPnl:'Average P&L (€)',winRate:'Win rate (%)',count:'Closed trades'};
 const list=[...items].sort((a,b)=>a[metric]-b[metric]);
 return {
  animationDuration:600,
  tooltip:{trigger:'item',confine:true,...tooltipStyle,formatter:(raw:unknown)=>{
   const p=raw as {dataIndex:number};const x=list[p.dataIndex];if(!x)return '';
   return `<b>${safe(x.label)}</b><br/>Average P&L: <b>${money(x.avgPnl)}</b><br/>Win rate: <b>${rate(x.winRate)}</b><br/>Closed trades: <b>${x.count}</b><br/><span style="color:#95a4ba">Tags can overlap across trades</span>`;
  }},
  grid:{left:184,right:45,top:9,bottom:32,containLabel:false},
  xAxis:{type:'value',axisLine,axisLabel:{color:chartColors.axis,fontSize:11,formatter:(v:number)=>metric==='avgPnl'?`${v}€`:metric==='winRate'?`${v}%`:String(v)},splitLine:{lineStyle:{color:chartColors.grid}},axisTick:{show:false}},
  yAxis:{type:'category',data:list.map(x=>x.label.replace('Setup · ','').replace(' · No / untagged',' · No*')),axisLabel:{color:'#bec9d9',fontSize:11,interval:0,overflow:'truncate',width:174},axisLine:{show:false},axisTick:{show:false}},
  series:[{type:'bar',barMaxWidth:15,data:list.map(x=>({value:x[metric],itemStyle:{color:metric==='avgPnl'?palette(x.avgPnl):x.group==='Setup'?chartColors.blue:chartColors.purple,borderRadius:[0,4,4,0]}})),label:{show:true,position:'right',color:'#b9c6da',fontSize:10,formatter:(p:{value:unknown})=>metric==='avgPnl'?`${Number(p.value).toFixed(1)}€`:metric==='winRate'?`${Number(p.value).toFixed(0)}%`:String(p.value)}}]
 } as EChartsOption;
}
function chartOptionTime(items:TimePerformance[],metric:'winRate'|'avgPnl',horizontal=false):EChartsOption {
 return {
  animationDuration:450,tooltip:{trigger:'axis',axisPointer:{type:'shadow'},...tooltipStyle,formatter:(p:unknown)=>{const e=(p as {dataIndex:number}[])[0];const x=items[e?.dataIndex];return x?`<b>${safe(x.label)}</b><br/>Win rate: ${rate(x.winRate)}<br/>Average P&L: ${money(x.avgPnl)}<br/>Trades: ${x.count}`:'';}},
  grid:horizontal?{left:82,right:27,top:15,bottom:25}:{left:42,right:16,top:23,bottom:35},
  xAxis:horizontal?{type:'value',max:metric==='winRate'?100:undefined,splitLine:{lineStyle:{color:chartColors.grid}},axisLabel:{color:chartColors.axis,fontSize:10},axisLine}:{type:'category',data:items.map(x=>x.label),axisLabel:{color:chartColors.axis,fontSize:10,interval:0,rotate:items.length>12?45:0},axisLine,axisTick:{show:false}},
  yAxis:horizontal?{type:'category',data:items.map(x=>x.label),axisLabel:{color:chartColors.axis,fontSize:11},axisLine,axisTick:{show:false}}:{type:'value',max:metric==='winRate'?100:undefined,axisLabel:{color:chartColors.axis,fontSize:10,formatter:metric==='winRate'?'{value}%':'{value}'},splitLine:{lineStyle:{color:chartColors.grid}}},
  series:[{type:'bar',barMaxWidth:28,data:items.map(x=>({value:x[metric],itemStyle:{color:metric==='winRate'?chartColors.blue:fill(x),borderRadius:horizontal?[0,6,6,0]:[6,6,0,0]}}))}]
 } as EChartsOption;
}
function Outcomes({wins,losses,even}:{wins:number;losses:number;even:number}){
 const arr=[{value:wins,name:'Wins',itemStyle:{color:chartColors.profit}},{value:losses,name:'Losses',itemStyle:{color:chartColors.loss}},{value:even,name:'Break-even',itemStyle:{color:'#7689a6'}}].filter(x=>x.value);
 if(!arr.length)return <div className="grid h-[260px] place-items-center text-sm text-slate-500">No closed trades yet</div>;
 const options:EChartsOption={tooltip:{trigger:'item',...tooltipStyle,formatter:'{b}: {c} trades ({d}%)'},legend:{bottom:4,textStyle:{color:'#b8c6d8',fontSize:12},itemWidth:10,itemHeight:10},series:[{type:'pie',radius:['58%','79%'],center:['50%','43%'],data:arr,avoidLabelOverlap:true,label:{show:false},emphasis:{scale:true,scaleSize:4},itemStyle:{borderColor:'#101725',borderWidth:5,borderRadius:5}}],graphic:[{type:'text',left:'center',top:'38%',style:{text:`${wins+losses+even}`,fill:'#f1f4fc',fontSize:29,fontWeight:700,textAlign:'center'}},{type:'text',left:'center',top:'50%',style:{text:'CLOSED TRADES',fill:'#8492aa',fontSize:10,textAlign:'center'}}]};
 return <EChart options={options} height={285} label="Distribution of winning, losing and breakeven trades"/>;
}
function NoData(){return <div className="grid h-[230px] place-items-center text-center text-sm text-slate-500">No matching closed trades yet.<br/>Choose another period or account.</div>}
export function Dashboard({data,loadError}:{data:DashboardPayload;loadError:string|null}){
 const router=useRouter();const [metric,setMetric]=useState<Metric>('avgPnl');const [group,setGroup]=useState<'all'|'Setup'|'Confluence'>('all');const [minSample,setMinSample]=useState(1);
 const p=data.performance;const conditions=useMemo(()=>p.comparisons.filter(x=>(group==='all'||x.group===group)&&x.count>=minSample),[p.comparisons,group,minSample]);
 const conditionOptions=useMemo(()=>chartOptionBars(conditions,metric),[conditions,metric]);
 const weekdayOptions=useMemo(()=>chartOptionTime(p.weekdays,'winRate'),[p.weekdays]);
 const hourOptions=useMemo(()=>chartOptionTime(p.hours,'winRate',true),[p.hours]);
 const sessionOptions=useMemo(()=>chartOptionTime(p.sessions,'avgPnl',true),[p.sessions]);
 const periodLink=(period:string)=>`/?period=${period}&account=${data.selectedAccount}`;
 const accountLink=(account:string)=>`/?period=${data.selectedPeriod}&account=${account}`;
 useEffect(()=>{const timer=setInterval(()=>router.refresh(),90000);return()=>clearInterval(timer);},[router]);
 const synced=data.status?.lastSyncedAt?new Date(data.status.lastSyncedAt).toLocaleString('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Berlin'}):'Waiting for first sync';
 return <div className="bg-mesh min-h-screen">
  <div className="mx-auto flex min-h-screen max-w-[1740px]">
   <aside className="sticky top-0 hidden h-screen w-[244px] shrink-0 flex-col border-r border-white/[.06] bg-[#0a101c]/85 px-4 py-7 backdrop-blur-xl lg:flex">
    <div className="mb-12 flex items-center gap-3 px-3"><div className="grid h-10 w-10 place-items-center rounded-[12px] bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-700/20"><Activity size={21} className="text-white"/></div><div><div className="text-sm font-bold tracking-[.15em] text-white">GIMM</div><div className="text-[10px] uppercase tracking-[.22em] text-slate-500">TRADING INTELLIGENCE</div></div></div>
    <span className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.17em] text-slate-600">WORKSPACE</span>
    {[{id:'overview',icon:LayoutDashboard,title:'Overview'},{id:'equity',icon:TrendingUp,title:'Equity & P&L'},{id:'confluences',icon:SlidersHorizontal,title:'Setups & Confluences'},{id:'timing',icon:CalendarDays,title:'Trading Times'},{id:'trades',icon:Database,title:'Recent Trades'}].map((item,i)=><a key={item.id} href={`#${item.id}`} className={cn('mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-colors hover:bg-white/[.045] hover:text-white',i===0?'bg-violet-500/10 text-violet-300':'text-slate-400')}><item.icon size={17}/>{item.title}</a>)}
    <div className="mt-auto rounded-[18px] border border-violet-400/10 bg-gradient-to-br from-violet-500/10 to-transparent p-4"><div className="flex items-center gap-2 text-sm font-medium text-slate-200"><ShieldCheck size={16} className="text-emerald-400"/>Private workspace</div><p className="mt-2 text-xs leading-5 text-slate-400">Source data remains in Notion. Your dashboard uses a read-only synced copy.</p><a href="https://www.notion.so/3b40d88a58948372aae501b644f17727" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200">Open Trading Journal <ExternalLink size={12}/></a></div>
   </aside>
   <main className="min-w-0 flex-1 px-4 pb-20 pt-7 sm:px-8 lg:px-10 xl:px-12">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[.07] pb-6">
     <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/15 text-violet-300 lg:hidden"><Activity size={21}/></div><div><div className="flex items-center gap-2"><span className="text-[11px] uppercase tracking-[.22em] text-slate-500">PRIVATE ANALYTICS</span><span className="h-1 w-1 rounded-full bg-slate-600"/><span className="text-[11px] text-violet-400">V1.0</span></div><h1 className="mt-1 text-[26px] font-semibold tracking-[-.045em] text-white sm:text-[31px]">Trading Dashboard</h1></div></div>
     <div className="flex items-center gap-2"><Badge className={cn('gap-2',data.status?.state==='ok'?'text-emerald-300':'text-amber-300')}><span className={cn('h-2 w-2 rounded-full',data.status?.state==='ok'?'bg-emerald-400':'bg-amber-400')}/>{data.status?.state==='ok'?'Synced':'Sync pending'}</Badge><Button variant="outline" size="sm" onClick={()=>router.refresh()}><RefreshCw size={14}/> Refresh</Button></div>
    </header>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
     <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400"><span className="flex items-center gap-2"><Clock3 size={13}/> Last sync: {synced}</span><span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block"/><span className="flex items-center gap-2"><Database size={13}/> Notion · {data.selectedAccount==='all'?'All accounts':data.selectedAccount}</span></div>
     <div className="flex flex-wrap items-center gap-2"><div className="flex items-center gap-1 rounded-xl border border-white/[.08] bg-white/[.035] p-1">{[['30d','30D'],['90d','90D'],['365d','1Y'],['all','ALL']].map(([id,label])=><Link key={id} href={periodLink(id)} className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',data.selectedPeriod===id?'bg-violet-500 text-white shadow-md shadow-violet-500/15':'text-slate-400 hover:text-white')}>{label}</Link>)}</div>
      <div className="relative"><select aria-label="Account filter" className="h-9 appearance-none rounded-xl border border-white/[.09] bg-[#182132] pl-3 pr-8 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-violet-500" value={data.selectedAccount} onChange={e=>router.push(accountLink(e.target.value))}><option value="Forwardtesting">Forwardtesting</option><option value="Backtest">Backtest</option><option value="all">All accounts</option></select><ChevronDown size={13} className="pointer-events-none absolute right-2.5 top-3 text-slate-400"/></div>
     </div>
    </div>
    {(loadError||data.status?.state==='error'||data.status?.state==='warning')&&<div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/[.065] p-4 text-sm text-amber-200"><b>Sync notice:</b> {loadError||data.status?.lastError||'Check worker logs.'} The dashboard may show incomplete or older data.</div>}

    <div className="mt-9 space-y-11">
     <Section id="overview" eyebrow="01 / COMMAND CENTER" title="Performance Overview" description="Real-time metrics calculated from your synced Notion trades.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
       <Stat label="Net Trading P&L" value={money(p.netPnl)} description="Realized result · excluding cash transfers" negative={p.netPnl<0} tone="blue" icon={<TrendingUp size={18}/>}/>
       <Stat label="Win Rate" value={rate(p.winRate)} description={`${p.wins} wins out of ${p.closed} closed trades`} tone="green" icon={<Target size={18}/>}/>
       <Stat label="Closed Trades" value={number(p.closed)} description={`${p.total} records · ${p.breakeven} break-even`} icon={<Activity size={18}/>}/>
       <Stat label="Avg. Trade P&L" value={money(p.avgPnl)} description="Average realized P&L per closed trade" negative={p.avgPnl<0} icon={<ArrowUpRight size={18}/>}/>
       <Stat label="Profit Factor" value={p.profitFactor===null?'—':p.profitFactor.toFixed(2)} description="Gross profit / absolute gross loss" icon={<Gauge size={18}/>}/>
       <Stat label="Max Trading Drawdown" value={money(-p.maxDrawdown)} description="From cumulative realized P&L (not account equity)" negative={p.maxDrawdown>0} icon={<ArrowDownRight size={18}/>}/>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500"><Badge>Avg. R: {p.avgR===null?'—':p.avgR.toFixed(2)}</Badge><Badge>Best: {p.bestTrade===null?'—':money(p.bestTrade)}</Badge><Badge>Worst: {p.worstTrade===null?'—':money(p.worstTrade)}</Badge><span>R depends on the values entered in Notion and may contain outliers.</span></div>
     </Section>
     <Section id="equity" eyebrow="02 / CAPITAL PERFORMANCE" title="Equity & Trading P&L" description="Two series in one chart, with independent scales for account balance and cumulative realized P&L.">
      <ChartCard title="Account Balance vs. Cumulative Trading P&L" subtitle="Account balance includes transfers. Cumulative P&L sums realized trade outcomes for the selected period. Both curves use separate Y-axis scales." footer="Blue · cumulative trade P&L (right scale) · Green · recorded account balance (left scale). Trading P&L is not the same as account equity.">
       <div className="mb-3 flex flex-wrap items-center gap-5 px-4 pt-1 text-xs"><span className="flex items-center gap-2 text-slate-300"><i className="h-2.5 w-2.5 rounded-full bg-[#6d9eff]"/>Cumulative trading P&L</span><span className="flex items-center gap-2 text-slate-300"><i className="h-2.5 w-2.5 rounded-full bg-[#34d5a4]"/>Account balance</span></div>
       <EquityChart equity={p.cumulative} balance={p.balance}/>
      </ChartCard>
     </Section>
     <Section id="confluences" eyebrow="03 / STRATEGY INTELLIGENCE" title="Setup & Confluence Analytics" description="A single comparative chart for your setups, DXY, Liquidity Sweep, 1m Type 3 and other confirmations.">
      <ChartCard title="Realized Performance by Setup & Confluence" subtitle="Each bar reflects trades tagged with that setup or condition. Trades may appear in multiple categories. Unticked checkboxes can also mean not recorded." footer="Live: reflects your latest Notion sync. Inspect trade counts and avoid relying on very small samples.">
       <div className="flex flex-wrap items-center justify-between gap-3 px-4 pb-1">
        <div className="flex flex-wrap gap-1 rounded-xl border border-white/[.07] bg-white/[.025] p-1">{([['avgPnl','Avg. P&L'],['winRate','Win Rate'],['count','Trade Count']] as const).map(([id,label])=><button type="button" key={id} onClick={()=>setMetric(id)} className={cn('rounded-lg px-3 py-2 text-[11px] font-semibold transition-colors',metric===id?'bg-[#334464] text-white':'text-slate-400 hover:text-slate-100')}>{label}</button>)}</div>
        <div className="flex flex-wrap items-center gap-2"><select value={group} onChange={e=>setGroup(e.target.value as typeof group)} aria-label="Group filter" className="rounded-lg border border-white/[.08] bg-[#202b3e] px-3 py-2 text-xs text-slate-200"><option value="all">All groups</option><option value="Setup">Setups only</option><option value="Confluence">Confluences only</option></select><select value={minSample} onChange={e=>setMinSample(Number(e.target.value))} aria-label="Minimum sample size" className="rounded-lg border border-white/[.08] bg-[#202b3e] px-3 py-2 text-xs text-slate-200"><option value={1}>Any n</option><option value={5}>n ≥ 5</option><option value={10}>n ≥ 10</option><option value={20}>n ≥ 20</option></select></div>
       </div>
       {conditions.length?<EChart options={conditionOptions} height={Math.max(315,conditions.length*31+72)} label="Realized trade performance across setup and confluence conditions"/>:<NoData/>}
      </ChartCard>
     </Section>
     <Section id="timing" eyebrow="04 / EXECUTION PATTERNS" title="Best Trading Days & Times" description="Understand when your win rate is higher, while keeping the number of trades in view.">
      <div className="grid gap-4 xl:grid-cols-2">
       <ChartCard title="Win Rate by Weekday" subtitle="Percentage of profitable closed trades on each weekday. Hover to see the number of trades.">{p.weekdays.length?<EChart height={278} options={weekdayOptions} label="Trading win rate by weekday"/>:<NoData/>}</ChartCard>
       <ChartCard title="Win Rate by Entry Hour" subtitle="Win rate by hour of recorded entry time, using Europe/Berlin time. Hover for sample size.">{p.hours.length?<EChart height={278} options={hourOptions} label="Trading win rate by entry hour"/>:<NoData/>}</ChartCard>
       <ChartCard title="Average Realized P&L by Session" subtitle="Compare the average euro profit or loss per trade across your sessions.">{p.sessions.length?<EChart height={Math.max(260,p.sessions.length*31+50)} options={sessionOptions} label="Average realized euros by trading session"/>:<NoData/>}</ChartCard>
       <ChartCard title="Trade Outcomes" subtitle="Distribution of wins, losses and break-even trades in the selected period."><Outcomes wins={p.wins} losses={p.losses} even={p.breakeven}/></ChartCard>
      </div>
     </Section>
     <Section id="trades" eyebrow="05 / JOURNAL" title="Recent Trades" description="Most recently dated entries from the synced Notion source." aside={<a href="https://www.notion.so/3b40d88a58948372aae501b644f17727" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-100">Open Notion <ExternalLink size={13}/></a>}>
      <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left"><thead className="border-b border-white/[.07] bg-white/[.025] text-[10px] uppercase tracking-[.16em] text-slate-500"><tr><th className="px-5 py-4 font-semibold">Trade</th><th className="px-4 py-4 font-semibold">Date</th><th className="px-4 py-4 font-semibold">Pair</th><th className="px-4 py-4 font-semibold">Setup</th><th className="px-4 py-4 font-semibold">Direction</th><th className="px-5 py-4 text-right font-semibold">Realized P&L</th></tr></thead><tbody>{data.trades.map((t,i)=><tr key={t.id} className={cn('border-t border-white/[.05] text-xs text-slate-300',i%2?'bg-white/[.012]':'')}><td className="px-5 py-4 font-semibold text-slate-100">#{t.tradeId||'—'}</td><td className="whitespace-nowrap px-4 py-4 text-slate-400">{t.dateTime?new Date(t.dateTime).toLocaleDateString('en-GB',{dateStyle:'medium',timeZone:'Europe/Berlin'}):'—'}</td><td className="px-4 py-4">{t.pair||'—'}</td><td className="max-w-[250px] truncate px-4 py-4 text-slate-400">{t.setup.join(', ')||'—'}</td><td className="px-4 py-4">{t.position||'—'}</td><td className={cn('px-5 py-4 text-right font-semibold tabular-nums',t.netEur===null?'text-slate-600':t.netEur>=0?'text-emerald-400':'text-rose-400')}>{t.netEur===null?'Open / unrecorded':money(t.netEur)}</td></tr>)}{data.trades.length===0&&<tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">No trades. Confirm the Notion integration can read your Trading Journal.</td></tr>}</tbody></table></div></Card>
     </Section>
    </div>
    <footer className="mt-16 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-6 text-[11px] text-slate-500"><span>© GIMM Holding · Private Trading Intelligence</span><span className="flex items-center gap-1.5"><ShieldCheck size={12}/> Read-only Notion source · Values are descriptive, not financial advice</span></footer>
   </main>
  </div>
 </div>;
}
