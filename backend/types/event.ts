/**
 * Canonical event types for the ingest pipeline.
 */

export interface RawScrapedEvent {
  name?: string;
  description?: string;
  address?: string;
  startTime?: string;
  date?: string;
  price?: string;
  category?: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string | null;
  locationQuality?: string | null;
  createdAt?: string;
  scrapedAt?: string;
  confidence?: number;
  score?: number;
}

export interface NormalizedEvent {
  id: string;
  source: string;
  name: string;
  description: string;
  address: string;
  startTime: string;
  date: string;
  price: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  locationQuality: string | null;
  createdAt: string;
  scrapedAt?: string;
  confidence?: number;
  score?: number;
}

export type ValidatedEvent = NormalizedEvent;

export type PersistedEvent = NormalizedEvent;
