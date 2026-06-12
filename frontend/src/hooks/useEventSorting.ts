import { useMemo } from 'react';
import { Event } from '@/types/Event';
import { distanceMiles, type UserLocation } from '@/lib/geo';

export type SortOption = 'date' | 'distance' | 'relevance';

function parseDateValue(date: string | null): number {
  if (!date || date === 'TBD') return Number.POSITIVE_INFINITY;
  const parsed = new Date(`${date.split('T')[0]}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? Number.POSITIVE_INFINITY : parsed.getTime();
}

export function useEventSorting(
  events: Event[],
  sort: SortOption,
  userLocation: UserLocation | null,
  hasSearchQuery: boolean
): Event[] {
  return useMemo(() => {
    const result = [...events];

    if (sort === 'relevance' && hasSearchQuery) {
      return result.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }

    if (sort === 'distance' && userLocation) {
      return result.sort((a, b) => {
        const da = distanceMiles(userLocation.lat, userLocation.lng, a.lat, a.lng);
        const db = distanceMiles(userLocation.lat, userLocation.lng, b.lat, b.lng);
        return da - db;
      });
    }

    return result.sort((a, b) => parseDateValue(a.date) - parseDateValue(b.date));
  }, [events, sort, userLocation, hasSearchQuery]);
}
