export type PriceFilter = 'all' | 'free' | 'paid';

export function isFreePrice(price: string | null | undefined): boolean {
  if (!price) return false;
  const normalized = price.trim().toLowerCase();
  if (!normalized || normalized === 'tbd') return false;
  if (normalized === 'free' || normalized === '$0' || normalized === '0') return true;
  if (/^free\b/.test(normalized)) return true;
  const amount = parseFloat(normalized.replace(/[^0-9.]/g, ''));
  return !Number.isNaN(amount) && amount === 0;
}

export function matchesPriceFilter(price: string, filter: PriceFilter): boolean {
  if (filter === 'all') return true;
  const free = isFreePrice(price);
  return filter === 'free' ? free : !free;
}

export function getPriceFilterLabel(filter: PriceFilter): string {
  if (filter === 'free') return 'Free';
  if (filter === 'paid') return 'Paid';
  return 'All prices';
}
