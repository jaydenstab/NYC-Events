import { apiUrl, apiAuthHeaders } from '@/lib/apiConfig';
import { extractEventsArray, extractEventsMeta, EventsApiMeta } from '@/lib/apiResponse';
import { classifyEventLink } from '@/lib/eventLink';
import { Event } from '@/types/Event';

export type DataSource = 'live' | 'demo';

export type DemoFallbackReason = 'empty_db' | 'network_error';

export interface FetchEventsResult {
  events: Event[];
  meta: EventsApiMeta;
  dataSource: DataSource;
  /** Set when dataSource is demo — drives banner copy */
  demoReason?: DemoFallbackReason;
}

export interface FetchEventsOptions {
  search?: string;
  semantic?: boolean;
  signal?: AbortSignal;
  /** Skip list pagination (search/semantic use server-side full scan) */
  paginate?: boolean;
  page?: number;
  perPage?: number;
}

export class EventsFetchError extends Error {
  readonly authError: boolean;
  readonly status?: number;

  constructor(message: string, options: { authError?: boolean; status?: number } = {}) {
    super(message);
    this.name = 'EventsFetchError';
    this.authError = Boolean(options.authError);
    this.status = options.status;
  }
}

const NYC_DEFAULT = { lat: 40.7282, lng: -73.9857 };

/** Default list fetch — matches current DB scale; raise when catalog grows */
export const DEFAULT_EVENTS_PER_PAGE = 100;

function readPerPageEnv(): number {
  const raw = import.meta.env.VITE_EVENTS_PER_PAGE as string | undefined;
  if (!raw) return DEFAULT_EVENTS_PER_PAGE;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 100) : DEFAULT_EVENTS_PER_PAGE;
}

export const EVENTS_PER_PAGE = readPerPageEnv();

function hasValidCoords(raw: Record<string, unknown>): boolean {
  const lat = Number(raw.latitude);
  const lng = Number(raw.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);
}

export function toUiEvent(raw: Record<string, unknown>, index: number): Event {
  const coordsValid = hasValidCoords(raw);
  const locationQuality =
    raw.locationQuality != null
      ? (String(raw.locationQuality) as Event['locationQuality'])
      : coordsValid
        ? undefined
        : 'default';

  const website = raw.website != null ? String(raw.website) : null;
  const linkKind = classifyEventLink(website);

  return {
    id: String(raw.id || `event-${index + 1}`),
    name: String(raw.name || 'Unknown Event'),
    category: String(raw.category || 'other').toLowerCase(),
    lat: coordsValid ? Number(raw.latitude) : NYC_DEFAULT.lat,
    lng: coordsValid ? Number(raw.longitude) : NYC_DEFAULT.lng,
    address: String(raw.address || 'New York, NY'),
    time: String(raw.startTime || 'TBD'),
    date: raw.date ? String(raw.date) : null,
    price: String(raw.price || 'Unknown'),
    description: String(raw.description || 'No description available'),
    website,
    linkKind,
    source: raw.source != null ? String(raw.source) : undefined,
    locationQuality,
    score: typeof raw.score === 'number' ? raw.score : undefined,
  };
}

function todayLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isUndatedOrFuture(date: string | null): boolean {
  if (!date) return true;
  const trimmed = date.trim();
  if (!trimmed || trimmed === 'TBD' || trimmed === 'Unknown') return true;

  const eventDate = trimmed.split('T')[0];
  return eventDate >= todayLocal();
}

function filterFutureEvents(events: Event[]): Event[] {
  return events.filter((event) => isUndatedOrFuture(event.date));
}

function buildEventsQuery(options: FetchEventsOptions): string {
  const params = new URLSearchParams();
  const search = options.search?.trim();
  const isSearch = Boolean(search);

  if (search) params.set('search', search);
  if (options.semantic) params.set('semantic', 'true');

  const shouldPaginate =
    options.paginate !== false && !isSearch && !options.semantic;

  if (shouldPaginate) {
    const page = options.page ?? 1;
    const perPage = options.perPage ?? EVENTS_PER_PAGE;
    params.set('page', String(page));
    params.set('per_page', String(perPage));
  }

  return params.toString();
}

export async function fetchEventsByIds(ids: string[]): Promise<FetchEventsResult> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) {
    return { events: [], meta: { totalCount: 0, idsMode: true }, dataSource: 'live' };
  }

  const params = new URLSearchParams();
  params.set('ids', unique.join(','));
  const path = `/api/events?${params.toString()}`;

  const response = await fetch(apiUrl(path), { headers: apiAuthHeaders() });

  if (response.status === 401) {
    throw new EventsFetchError('Unauthorized', { authError: true, status: 401 });
  }
  if (!response.ok) {
    throw new EventsFetchError(`HTTP error! status: ${response.status}`, {
      status: response.status,
    });
  }

  const data: unknown = await response.json();
  const rawEvents = extractEventsArray(data);
  const meta = extractEventsMeta(data);
  const events = filterFutureEvents(rawEvents.map((row, i) => toUiEvent(row, i)));

  return { events, meta, dataSource: 'live' };
}

export async function fetchEvents(
  options: FetchEventsOptions = {}
): Promise<FetchEventsResult> {
  const qs = buildEventsQuery(options);
  const path = qs ? `/api/events?${qs}` : '/api/events';

  const response = await fetch(apiUrl(path), {
    signal: options.signal,
    headers: apiAuthHeaders(),
  });

  if (response.status === 401) {
    throw new EventsFetchError('Unauthorized', { authError: true, status: 401 });
  }
  if (!response.ok) {
    throw new EventsFetchError(`HTTP error! status: ${response.status}`, {
      status: response.status,
    });
  }

  const data: unknown = await response.json();
  const rawEvents = extractEventsArray(data);
  const meta = extractEventsMeta(data);
  const events = filterFutureEvents(rawEvents.map((row, i) => toUiEvent(row, i)));

  return {
    events,
    meta,
    dataSource: 'live',
  };
}

export const fetchFallbackEvents = async (): Promise<Event[]> => {
  const { events: fallbackEvents } = await import('../data/events');
  return fallbackEvents.map((e) => {
    const website = e.website ?? null;
    return {
      ...e,
      website,
      linkKind: classifyEventLink(website),
      locationQuality: e.locationQuality || 'geocoded',
    };
  });
};

export async function loadEventsWithFallback(
  options: FetchEventsOptions = {}
): Promise<FetchEventsResult> {
  try {
    const result = await fetchEvents(options);
    const isSearching = Boolean(options.search?.trim());
    const dbTotal =
      typeof result.meta.totalCount === 'number'
        ? result.meta.totalCount
        : result.events.length;

    if (!isSearching && result.events.length === 0 && dbTotal === 0) {
      const fallbacks = await fetchFallbackEvents();
      return {
        events: fallbacks,
        meta: { ...result.meta, totalCount: fallbacks.length },
        dataSource: 'demo',
        demoReason: 'empty_db',
      };
    }

    return result;
  } catch (err) {
    if (err instanceof EventsFetchError && err.authError) {
      throw err;
    }
    const fallbacks = await fetchFallbackEvents();
    return {
      events: fallbacks,
      meta: { totalCount: fallbacks.length },
      dataSource: 'demo',
      demoReason: 'network_error',
    };
  }
}
