import { describe, it, expect } from 'vitest';
import { isFreePrice, matchesPriceFilter } from './price';

describe('price', () => {
  it('detects free prices', () => {
    expect(isFreePrice('Free')).toBe(true);
    expect(isFreePrice('$0')).toBe(true);
    expect(isFreePrice('$25')).toBe(false);
  });

  it('filters by price', () => {
    expect(matchesPriceFilter('Free', 'free')).toBe(true);
    expect(matchesPriceFilter('$10', 'free')).toBe(false);
    expect(matchesPriceFilter('$10', 'paid')).toBe(true);
  });
});
