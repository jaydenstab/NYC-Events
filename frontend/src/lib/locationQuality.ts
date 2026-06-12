import type { LocationQuality } from '@/types/Event';

export const PRECISE_LOCATION_QUALITIES = new Set<LocationQuality>([
  'geocoded',
  'venue_cache',
  'osm',
  'mapbox',
  'canonical',
  'db_cache',
]);

export function isPreciseLocation(quality?: LocationQuality): boolean {
  return Boolean(quality && PRECISE_LOCATION_QUALITIES.has(quality));
}
