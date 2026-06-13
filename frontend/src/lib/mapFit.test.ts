import { describe, it, expect } from 'vitest';
import { shouldAutoFitEvents } from './mapFit';
import type { Event } from '@/types/Event';
import { NYC_DEFAULT } from './geo';

const precise: Event = {
  id: '1',
  name: 'A',
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'NYC',
  time: '8pm',
  date: '2099-01-01',
  price: 'Free',
  description: '',
};

describe('shouldAutoFitEvents', () => {
  it('returns false for empty or oversized lists', () => {
    expect(shouldAutoFitEvents([])).toBe(false);
    expect(shouldAutoFitEvents(Array.from({ length: 51 }, (_, i) => ({ ...precise, id: String(i) })))).toBe(
      false
    );
  });

  it('returns false when all events use default coords', () => {
    expect(
      shouldAutoFitEvents([
        { ...precise, lat: NYC_DEFAULT.lat, lng: NYC_DEFAULT.lng, locationQuality: 'default' },
      ])
    ).toBe(false);
  });

  it('returns true when at least one event has precise coords', () => {
    expect(shouldAutoFitEvents([precise])).toBe(true);
  });
});
