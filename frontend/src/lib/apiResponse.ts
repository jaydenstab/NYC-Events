/**
 * Normalizes various backend event list shapes into a plain array.
 */
export function extractEventsArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload as Record<string, unknown>[];
  }
  if (payload && typeof payload === 'object' && 'events' in payload) {
    const inner = (payload as { events: unknown }).events;
    if (Array.isArray(inner)) {
      return inner as Record<string, unknown>[];
    }
  }
  return [];
}

export interface EventsApiMeta {
  totalCount?: number;
  page?: number;
  perPage?: number;
  requestId?: string;
  semanticIndexReady?: boolean;
  semanticFallback?: boolean;
  semanticIndexing?: boolean;
  indexError?: string | null;
  ingesting?: boolean;
  degradedSources?: string[];
  stale?: boolean;
  lastScrapeAt?: string | null;
  searchMode?: string;
  semantic?: boolean;
  searchQuery?: string | null;
  searchCapped?: boolean;
  searchLimit?: number;
  hybridSearch?: boolean;
  [key: string]: unknown;
}

export function extractEventsMeta(payload: unknown): EventsApiMeta {
  if (payload && typeof payload === 'object' && 'meta' in payload) {
    const meta = (payload as { meta: unknown }).meta;
    if (meta && typeof meta === 'object') {
      return meta as EventsApiMeta;
    }
  }
  return {};
}
