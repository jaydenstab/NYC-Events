import { describe, it, expect } from 'vitest';
import { resolveEventFromMapClick } from './mapEventResolver';
import { Event } from '@/types/Event';

const sampleEvents: Event[] = [
  {
    id: 'bing_food_abc123',
    name: 'Free Pizza Night',
    category: 'food',
    lat: 40.73,
    lng: -73.99,
    address: '123 Main St, New York, NY',
    time: '7:00 PM',
    date: '2099-06-01',
    price: 'Free',
    description: 'Community pizza event',
  },
];

describe('resolveEventFromMapClick', () => {
  it('returns full Event when id matches events list', () => {
    const resolved = resolveEventFromMapClick(
      sampleEvents,
      {
        id: 'bing_food_abc123',
        name: 'Wrong Name',
        time: 'TBD',
        category: 'other',
      },
      [-73.99, 40.73]
    );
    expect(resolved).toEqual(sampleEvents[0]);
  });

  it('builds fallback Event from properties when id not found', () => {
    const resolved = resolveEventFromMapClick(
      sampleEvents,
      {
        id: 'unknown_id',
        name: 'Pop-up Market',
        category: 'food',
        address: 'Union Square, NY',
        time: '12:00 PM',
        date: '2099-07-04',
        price: 'Free',
        description: 'Local vendors',
      },
      [-73.99, 40.74]
    );
    expect(resolved?.name).toBe('Pop-up Market');
    expect(resolved?.lat).toBe(40.74);
    expect(resolved?.lng).toBe(-73.99);
    expect(resolved?.time).toBe('12:00 PM');
  });

  it('returns null when properties and coordinates missing', () => {
    expect(resolveEventFromMapClick(sampleEvents, null)).toBeNull();
    expect(resolveEventFromMapClick(sampleEvents, { name: 'X' })).toBeNull();
  });
});
