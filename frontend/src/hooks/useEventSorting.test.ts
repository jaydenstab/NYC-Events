import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEventSorting } from './useEventSorting';
import type { Event } from '@/types/Event';

const base = (overrides: Partial<Event>): Event => ({
  id: '1',
  name: 'Event',
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'NYC',
  time: '8pm',
  date: '2099-01-01',
  price: 'Free',
  description: '',
  ...overrides,
});

const events: Event[] = [
  base({ id: 'a', name: 'Later', date: '2099-03-01' }),
  base({ id: 'b', name: 'Soon', date: '2099-01-15' }),
  base({ id: 'c', name: 'TBD', date: 'TBD' }),
];

describe('useEventSorting', () => {
  it('sorts by date ascending with TBD last', () => {
    const { result } = renderHook(() => useEventSorting(events, 'date', null, false));
    expect(result.current.map((e) => e.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by distance when user location is available', () => {
    const withCoords: Event[] = [
      base({ id: 'far', lat: 40.9, lng: -73.9 }),
      base({ id: 'near', lat: 40.751, lng: -73.991 }),
    ];
    const { result } = renderHook(() =>
      useEventSorting(withCoords, 'distance', { lat: 40.75, lng: -73.99 }, false)
    );
    expect(result.current[0].id).toBe('near');
  });

  it('sorts by relevance score when search is active', () => {
    const scored: Event[] = [
      base({ id: 'low', score: 0.2 }),
      base({ id: 'high', score: 0.9 }),
    ];
    const { result } = renderHook(() => useEventSorting(scored, 'relevance', null, true));
    expect(result.current[0].id).toBe('high');
  });
});
