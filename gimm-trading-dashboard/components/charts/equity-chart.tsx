'use client';

import { useEffect, useRef, useState } from 'react';
import type { IChartApi, ISeriesApi, Time } from 'lightweight-charts';
import type { BalancePoint } from '@/lib/types';
import { EmptyState } from '@/components/dashboard/primitives';

function setSeries(chart: IChartApi, pnl: ISeriesApi<'Area'>, account: ISeriesApi<'Line'>, equity: BalancePoint[], balance: BalancePoint[]) {
  pnl.setData(equity.map(point => ({ time: point.time as Time, value: point.value })));
  account.setData(balance.map(point => ({ time: point.time as Time, value: point.value })));
  chart.priceScale('left').applyOptions({ visible: balance.length > 0 });
}

export function EquityChart({ equity, balance }: { equity: BalancePoint[]; balance: BalancePoint[] }) {
  const element = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const pnl = useRef<ISeriesApi<'Area'> | null>(null);
  const account = useRef<ISeriesApi<'Line'> | null>(null);
  const latest = useRef({ equity, balance });
  latest.current = { equity, balance };
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const hasData = equity.length > 0 || balance.length > 0;

  useEffect(() => {
    if (!hasData) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    setState('loading');
    (async () => {
      const { createChart, AreaSeries, LineSeries, ColorType } = await import('lightweight-charts');
      if (disposed || !element.current) return;
      const instance = createChart(element.current, {
        width: element.current.clientWidth, height: 265,
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#778399', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif', fontSize: 9 },
        grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255,255,255,.025)' } },
        rightPriceScale: { borderVisible: false }, leftPriceScale: { visible: false, borderVisible: false },
        timeScale: { borderVisible: false, timeVisible: false }, crosshair: { mode: 0 },
        localization: { priceFormatter: (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value) },
      });
      chart.current = instance;
      pnl.current = instance.addSeries(AreaSeries, { priceScaleId: 'right', lineColor: '#6cddb1', topColor: 'rgba(108,221,177,.18)', bottomColor: 'rgba(108,221,177,.005)', lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
      account.current = instance.addSeries(LineSeries, { priceScaleId: 'left', color: '#b5a2ff', lineWidth: 2, priceLineVisible: false, lastValueVisible: true });
      setSeries(instance, pnl.current, account.current, latest.current.equity, latest.current.balance);
      instance.timeScale().fitContent();
      observer = new ResizeObserver(([entry]) => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => chart.current?.applyOptions({ width: entry.contentRect.width })); });
      observer.observe(element.current);
      setState('ready');
    })().catch(() => { if (!disposed) setState('error'); });
    return () => { disposed = true; observer?.disconnect(); cancelAnimationFrame(frame); chart.current?.remove(); chart.current = null; pnl.current = null; account.current = null; };
  }, [hasData]);

  useEffect(() => {
    if (chart.current && pnl.current && account.current) setSeries(chart.current, pnl.current, account.current, equity, balance);
  }, [equity, balance]);

  if (!hasData) return <EmptyState title="Your equity story starts here" description="Dated trading results will bring this chart to life."/>;
  return <div style={{ position: 'relative', height: 265 }} role="img" aria-busy={state === 'loading'} aria-label={balance.length ? 'Recorded account balance and cumulative realized trading P&L' : 'Cumulative realized trading P&L'}><div ref={element} style={{ height: '100%', width: '100%' }}/>{state === 'loading' && <div className="chart-skeleton" aria-hidden="true"/>}{state === 'error' && <p className="absolute inset-0 grid place-items-center text-xs text-slate-400">Chart unavailable. Your journal and metrics are still available.</p>}</div>;
}
