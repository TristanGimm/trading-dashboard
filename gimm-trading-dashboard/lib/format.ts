export const money = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
export const compactMoney = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', notation: 'compact', minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value);
export const number = (value: number) => new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
export const rate = (value: number) => `${value.toFixed(1)}%`;
export const JOURNAL_URL = 'https://www.notion.so/3b40d88a58948372aae501b644f17727';
export function tradeUrl(id: string): string {
  return /^[a-f0-9-]{32,36}$/i.test(id) ? `https://www.notion.so/${id.replace(/-/g, '')}` : JOURNAL_URL;
}
