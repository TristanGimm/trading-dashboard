'use client';
import { useEffect,useRef } from 'react';
import type { BalancePoint } from '@/lib/types';
export function EquityChart({equity,balance}:{equity:BalancePoint[];balance:BalancePoint[]}){
 const el=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!el.current||(!equity.length&&!balance.length))return;
  let dead=false;let cleanup:()=>void=()=>{};
  (async()=>{
    const {createChart,AreaSeries,LineSeries,ColorType}=await import('lightweight-charts');
    if(dead||!el.current)return;
    const chart=createChart(el.current,{width:el.current.clientWidth,height:320,
      layout:{background:{type:ColorType.Solid,color:'transparent'},textColor:'#8290a9',fontFamily:'inherit',fontSize:11},
      grid:{vertLines:{color:'rgba(110,130,160,.07)'},horzLines:{color:'rgba(110,130,160,.09)'}},
      rightPriceScale:{borderColor:'rgba(255,255,255,.08)'},leftPriceScale:{visible:true,borderColor:'rgba(255,255,255,.08)'},
      timeScale:{borderColor:'rgba(255,255,255,.08)',timeVisible:false},crosshair:{mode:0},
      localization:{priceFormatter:(v:number)=>v.toLocaleString('de-DE',{minimumFractionDigits:0,maximumFractionDigits:2})+' €'},
    });
    const a=chart.addSeries(AreaSeries,{priceScaleId:'right',lineColor:'#5f8eff',topColor:'rgba(95,142,255,.25)',bottomColor:'rgba(95,142,255,.015)',lineWidth:2,priceLineVisible:false,lastValueVisible:true});
    const b=chart.addSeries(LineSeries,{priceScaleId:'left',color:'#35d7a8',lineWidth:2,priceLineVisible:false,lastValueVisible:true});
    if(equity.length)a.setData(equity.map(x=>({time:x.time as `${number}-${number}-${number}`,value:x.value})));
    if(balance.length)b.setData(balance.map(x=>({time:x.time as `${number}-${number}-${number}`,value:x.value})));
    chart.timeScale().fitContent();
    const ro=new ResizeObserver(([entry])=>chart.applyOptions({width:entry.contentRect.width}));ro.observe(el.current);
    cleanup=()=>{ro.disconnect();chart.remove();};
  })().catch(console.error);
  return()=>{dead=true;cleanup();};
 },[equity,balance]);
 if(!equity.length&&!balance.length)return <EmptyChart/>;
 return <div ref={el} className="h-[320px] w-full" role="img" aria-label="Account balance and cumulative realized trading profit across dates"/>;
}
export function EmptyChart(){return <div className="grid h-64 place-items-center text-sm text-slate-500">No dated trades available for this chart</div>}
