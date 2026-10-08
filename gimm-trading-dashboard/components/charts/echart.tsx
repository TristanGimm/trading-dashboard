'use client';
import { useEffect,useRef } from 'react';
import type { EChartsOption } from 'echarts';
export function EChart({options,height=360,label}:{options:EChartsOption;height?:number;label:string}){
 const el=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!el.current)return;let disposed=false;let dispose:()=>void=()=>{};
  (async()=>{
   const e=await import('echarts');if(disposed||!el.current)return;
   const chart=e.init(el.current,undefined,{renderer:'canvas'});chart.setOption(options,{notMerge:true});
   const ro=new ResizeObserver(()=>chart.resize());ro.observe(el.current);dispose=()=>{ro.disconnect();chart.dispose();};
  })().catch(console.error);
  return()=>{disposed=true;dispose();};
 },[options]);
 return <div ref={el} style={{height}} className="w-full" role="img" aria-label={label}/>;
}
