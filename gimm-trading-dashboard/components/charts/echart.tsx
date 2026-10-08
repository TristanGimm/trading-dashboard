'use client';

import { useEffect, useRef, useState } from 'react';
import type { EChartsOption } from 'echarts';
import type { ECharts } from 'echarts/core';

export function EChart({ options, height = 280, label }: { options: EChartsOption; height?: number; label: string }) {
  const element = useRef<HTMLDivElement>(null);
  const chart = useRef<ECharts | null>(null);
  const latestOptions = useRef(options);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  latestOptions.current = options;

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    const apply = (config: EChartsOption) => ({ ...config, animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, aria: { enabled: true } });
    (async () => {
      const echarts = await import('@/lib/echarts');
      if (disposed || !element.current) return;
      chart.current = echarts.init(element.current, undefined, { renderer: 'canvas' });
      chart.current.setOption(apply(latestOptions.current), { notMerge: true });
      observer = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => chart.current?.resize()); });
      observer.observe(element.current);
      setState('ready');
    })().catch(() => { if (!disposed) setState('error'); });
    return () => { disposed = true; observer?.disconnect(); cancelAnimationFrame(frame); chart.current?.dispose(); chart.current = null; };
  }, []);

  useEffect(() => {
    chart.current?.setOption({ ...options, animation: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, aria: { enabled: true } }, { notMerge: true });
  }, [options]);

  return <div style={{ height, position: 'relative', minWidth: 0 }} role="img" aria-label={label} aria-busy={state === 'loading'}>
    <div ref={element} style={{ height: '100%', width: '100%' }}/>
    {state === 'loading' && <div className="chart-skeleton" aria-hidden="true"/>}
    {state === 'error' && <p className="absolute inset-0 grid place-items-center text-xs text-slate-400">Chart unavailable. Your metrics and journal remain available.</p>}
  </div>;
}
