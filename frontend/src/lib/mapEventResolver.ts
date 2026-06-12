import { Event } from '@/types/Event';

export interface MapFeatureProperties {
  id?: string;
  name?: string;
  category?: string;
  address?: string;
  description?: string;
  price?: string;
  time?: string;
  date?: string | null;
  [key: string]: unknown;
}

/**
 * Resolves a map marker click to a full Event from the events list.
 * GeoJSON properties use `time` instead of API `startTime` and omit lat/lng.
 */
export function resolveEventFromMapClick(
  events: Event[],
  properties: MapFeatureProperties | null | undefined,
  coordinates?: [number, number]
): Event | null {
  if (!properties) return null;

  const id = properties.id != null ? String(properties.id) : '';
  if (id) {
    const match = events.find((e) => e.id === id);
    if (match) return match;
  }

  const lng = coordinates?.[0];
  const lat = coordinates?.[1];
  if (lng == null || lat == null) return null;

  return {
    id: id || `map-${lng}-${lat}`,
    name: String(properties.name || 'Unknown Event'),
    category: String(properties.category || 'other').toLowerCase(),
    lat,
    lng,
    address: String(properties.address || 'New York, NY'),
    time: String(properties.time || 'TBD'),
    date: properties.date != null ? String(properties.date) : null,
    price: String(properties.price || 'Unknown'),
    description: String(properties.description || 'No description available'),
  };
}
