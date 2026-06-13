import { describe, it, expect } from 'vitest';
import { buildFilteredListTitle } from './filters';

describe('buildFilteredListTitle', () => {
  it('builds a title for date filters', () => {
    expect(
      buildFilteredListTitle(
        {
          searchQuery: '',
          selectedCategory: 'all',
          selectedDateRange: 'today',
          selectedBorough: 'all',
          selectedPrice: 'all',
          selectedTimeOfDay: 'all',
          showSavedOnly: false,
        },
        3
      )
    ).toBe('Tonight · 3 events');
  });

  it('returns null for search-scoped lists', () => {
    expect(
      buildFilteredListTitle(
        {
          searchQuery: 'jazz',
          selectedCategory: 'all',
          selectedDateRange: 'all',
          selectedBorough: 'all',
          selectedPrice: 'all',
          selectedTimeOfDay: 'all',
          showSavedOnly: false,
        },
        5
      )
    ).toBeNull();
  });
});
