import { requireSession } from '@/lib/auth';
import { getDashboardTimezone } from '@/lib/timezone';
import { calculatePerformance, filterTrades } from '@/lib/analytics';
import { getSyncStatus, listTrades } from '@/lib/db';
import { Dashboard } from '@/components/dashboard';
import { makeDemoTrades } from '@/lib/demo';
import type { DashboardPayload, DashboardView, Trade } from '@/lib/types';

export const dynamic = 'force-dynamic';

type DashboardQuery = { period?: string; account?: string; view?: string };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardQuery> }) {
  const query = await searchParams;
  const returnQuery = new URLSearchParams();
  if (typeof query.account === 'string') returnQuery.set('account', query.account);
  if (typeof query.period === 'string') returnQuery.set('period', query.period);
  if (typeof query.view === 'string') returnQuery.set('view', query.view);
  await requireSession(`/dashboard${returnQuery.size ? `?${returnQuery}` : ''}`);

  const timeZone = getDashboardTimezone(process.env.DASHBOARD_TIMEZONE);
  const account = ['Forwardtesting', 'Backtest', 'all'].includes(query.account || '') ? query.account! : 'Forwardtesting';
  const period = ['all', '30d', '90d', '365d'].includes(query.period || '') ? query.period! : 'all';
  const view: DashboardView = ['overview', 'journal', 'calendar', 'analytics'].includes(query.view || '') ? query.view as DashboardView : 'overview';
  const now = new Date();
  const todayParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now).map(part => [part.type, part.value]));
  // Explicit local-only fixture mode: it cannot be enabled against the deployed DB host.
  const demo = process.env.GIMM_DEMO_MODE === 'true' && process.env.PGHOST === '127.0.0.1' && process.env.PGPORT === '1';
  let trades: Trade[] = [];
  let status: DashboardPayload['status'] = null;
  let loadError: string | null = null;
  try {
    if (demo) {
      trades = filterTrades(makeDemoTrades(now), account, period, now);
      status = { state: 'demo', lastSyncedAt: now.toISOString(), lastError: null, lastCount: trades.length };
    } else {
      [trades, status] = await Promise.all([listTrades({ account, period }), getSyncStatus()]);
    }
  } catch {
    loadError = 'Trading data is currently unavailable.';
  }

  const recent = [...trades].sort((a, b) => (b.dateTime ? Date.parse(b.dateTime) : 0) - (a.dateTime ? Date.parse(a.dateTime) : 0));
  const payload: DashboardPayload = {
    view, demo, generatedAt: now.toISOString(),
    today: `${todayParts.year}-${todayParts.month}-${todayParts.day}`,
    timeZone,
    performance: calculatePerformance(trades, timeZone),
    trades: recent,
    status,
    lastTradeDate: recent.find(trade => trade.dateTime)?.dateTime || null,
    selectedAccount: account,
    selectedPeriod: period,
  };
  return <Dashboard data={payload} loadError={loadError}/>;
}
