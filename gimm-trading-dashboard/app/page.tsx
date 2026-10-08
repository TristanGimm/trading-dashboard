import { redirect } from 'next/navigation';

// Preserve existing bookmarked account/period filters.
export default async function Home({ searchParams }: { searchParams: Promise<{ period?: string; account?: string; view?: string }> }) {
  const query = await searchParams;
  const params = new URLSearchParams();
  if (typeof query.account === 'string') params.set('account', query.account);
  if (typeof query.period === 'string') params.set('period', query.period);
  if (typeof query.view === 'string') params.set('view', query.view);
  redirect(`/dashboard${params.size ? `?${params}` : ''}`);
}
