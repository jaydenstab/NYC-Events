import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadEventsWithFallback,
  fetchEvents,
  EventsFetchError,
  EVENTS_PER_PAGE,
  type DataSource,
  type DemoFallbackReason,
  type FetchEventsResult,
} from '@/services/api';
import type { EventsApiMeta } from '@/lib/apiResponse';
import { Event } from '@/types/Event';
import { getApiKey, apiUrl } from '@/lib/apiConfig';
import { useDebounce } from '@/hooks/useWindowSize';

export interface UseEventsDataOptions {
  searchDebounceMs?: number;
  searchQuery?: string;
  semanticSearch?: boolean;
}

export interface UseEventsDataReturn {
  events: Event[];
  loading: boolean;
  searchLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  apiMeta: EventsApiMeta;
  catalogTotalCount: number | undefined;
  dataSource: DataSource;
  demoReason: DemoFallbackReason | undefined;
  requestId: string | undefined;
  refetch: (query?: string, semantic?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
}

function dedupeById(events: Event[]): Event[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

export function useEventsData(options: UseEventsDataOptions = {}): UseEventsDataReturn {
  const { searchDebounceMs = 400, searchQuery = '', semanticSearch = true } = options;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [apiMeta, setApiMeta] = useState<EventsApiMeta>({});
  const [catalogTotalCount, setCatalogTotalCount] = useState<number | undefined>();
  const [dataSource, setDataSource] = useState<DataSource>('live');
  const [demoReason, setDemoReason] = useState<DemoFallbackReason | undefined>();
  const [requestId, setRequestId] = useState<string | undefined>();
  const [catalogExhausted, setCatalogExhausted] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, searchDebounceMs);
  const hadSearchRef = useRef(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  const applyResult = useCallback(
    (result: FetchEventsResult, append = false, isSearch = false) => {
      if (append) {
        if (result.rawEventCount === 0) {
          setCatalogExhausted(true);
        }
      } else if (!isSearch && typeof result.meta.totalCount === 'number') {
        setCatalogTotalCount(result.meta.totalCount);
      }

      setEvents((prev) => (append ? dedupeById([...prev, ...result.events]) : result.events));
      setApiMeta(result.meta);
      setDataSource(result.dataSource);
      setDemoReason(result.demoReason);
      setRequestId(typeof result.meta.requestId === 'string' ? result.meta.requestId : undefined);
      setError(null);
      if (!append) {
        setCatalogExhausted(false);
        setLoadMoreError(null);
      }
    },
    []
  );

  const refetch = useCallback(
    async (query = '', semantic = false, signal?: AbortSignal) => {
      try {
        if (!query) setLoading(true);
        else setSearchLoading(true);

        setPage(1);
        const isSearch = query.trim().length >= 2;
        const useSemantic = semantic && isSearch;
        const result = await loadEventsWithFallback({
          search: query,
          semantic: useSemantic,
          signal,
          page: 1,
        });
        applyResult(result, false, isSearch);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (err instanceof EventsFetchError && err.authError) {
          setError(
            getApiKey()
              ? 'API key rejected. Check VITE_API_KEY matches backend API_KEYS.'
              : 'API key required. Set VITE_API_KEY in frontend/.env.local to match backend API_KEYS.'
          );
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        setLoading(false);
        setSearchLoading(false);
      }
    },
    [applyResult]
  );

  const loadMore = useCallback(async () => {
    const term = debouncedSearch.trim();
    if (term.length >= 2 || isLoadingMore || loading || searchLoading) return;
    if (dataSource !== 'live') return;

    const total = catalogTotalCount ?? events.length;
    if (page * EVENTS_PER_PAGE >= total) {
      setCatalogExhausted(true);
      return;
    }
    if (events.length >= total) return;

    const nextPage = page + 1;
    try {
      setIsLoadingMore(true);
      setLoadMoreError(null);
      const result = await fetchEvents({ page: nextPage, paginate: true });
      applyResult(result, true, false);
      setPage(nextPage);
      if (result.rawEventCount === 0 || nextPage * EVENTS_PER_PAGE >= total) {
        setCatalogExhausted(true);
      }
    } catch (err) {
      if (err instanceof EventsFetchError && err.authError) return;
      setLoadMoreError(err instanceof Error ? err.message : 'Failed to load more events');
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    debouncedSearch,
    isLoadingMore,
    loading,
    searchLoading,
    dataSource,
    catalogTotalCount,
    events.length,
    page,
    applyResult,
  ]);

  const isSearching = debouncedSearch.trim().length >= 2;
  const hasMore =
    !isSearching &&
    dataSource === 'live' &&
    !catalogExhausted &&
    (catalogTotalCount ?? 0) > events.length;

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const term = debouncedSearch.trim();
    if (!term && !hadSearchRef.current) return;

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    hadSearchRef.current = !!term;
    const isSearch = term.length >= 2;
    const useSemantic = semanticSearch && isSearch;
    refetch(term, useSemantic, controller.signal);
  }, [debouncedSearch, semanticSearch, loading, refetch]);

  useEffect(() => {
    if (loading || !apiMeta.ingesting) return;

    let lastFetch = 0;
    const throttledRefetch = () => {
      if (Date.now() - lastFetch < 5000) return;
      lastFetch = Date.now();
      const term = debouncedSearch.trim();
      const useSemantic = semanticSearch && term.length >= 2;
      refetch(term, useSemantic);
    };

    let es: EventSource | null = null;
    let fallbackId: number | null = null;

    const key = getApiKey();
    if (!key) {
      fallbackId = window.setInterval(throttledRefetch, 30_000);
    } else {
      try {
        const streamUrl = `${apiUrl('/api/events/stream')}?api_key=${encodeURIComponent(key)}`;
        es = new EventSource(streamUrl);
        es.onmessage = throttledRefetch;
        es.onerror = () => {
          es?.close();
          es = null;
          if (fallbackId == null) {
            fallbackId = window.setInterval(throttledRefetch, 30_000);
          }
        };
      } catch {
        fallbackId = window.setInterval(throttledRefetch, 30_000);
      }
    }

    return () => {
      es?.close();
      if (fallbackId != null) window.clearInterval(fallbackId);
    };
  }, [loading, apiMeta.ingesting, refetch, debouncedSearch, semanticSearch]);

  return {
    events,
    loading,
    searchLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMoreError,
    apiMeta,
    catalogTotalCount,
    dataSource,
    demoReason,
    requestId,
    refetch,
    loadMore,
  };
}
