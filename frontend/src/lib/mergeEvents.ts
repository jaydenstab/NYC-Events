import type { Event } from '@/types/Event';

/** Merge event lists; later lists override earlier entries with the same id. */
export function mergeEventsById(...lists: Event[][]): Event[] {
  const map = new Map<string, Event>();
  for (const list of lists) {
    for (const event of list) {
      map.set(event.id, event);
    }
  }
  return [...map.values()];
}
