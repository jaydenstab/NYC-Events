import type { Event } from '@/types/Event';
import { isApproximateCoords } from '@/lib/geo';

export function shouldAutoFitEvents(events: Event[]): boolean {
  if (events.length === 0 || events.length > 50) return false;
  return events.some((e) => !isApproximateCoords(e.lat, e.lng, e.locationQuality));
}
