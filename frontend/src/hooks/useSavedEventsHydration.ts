import { useEffect, useState, useMemo } from 'react';
import { fetchEventsByIds, EventsFetchError } from '@/services/api';
import type { Event } from '@/types/Event';

export function useSavedEventsHydration(savedEventIds: string[], catalogEvents: Event[]) {
  const [hydratedEvents, setHydratedEvents] = useState<Event[]>([]);
  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const savedKey = savedEventIds.join(',');
  const catalogIdsKey = useMemo(
    () => catalogEvents.map((e) => e.id).sort().join(','),
    [catalogEvents]
  );

  const catalogIdSet = useMemo(() => new Set(catalogIdsKey.split(',').filter(Boolean)), [catalogIdsKey]);

  const hydratedIdSet = useMemo(
    () => new Set(hydratedEvents.map((e) => e.id)),
    [hydratedEvents]
  );

  const missingIds = useMemo(
    () => savedEventIds.filter((id) => !catalogIdSet.has(id) && !hydratedIdSet.has(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savedKey stabilizes savedEventIds array identity
    [savedKey, catalogIdSet, hydratedIdSet]
  );

  useEffect(() => {
    setHydratedEvents((prev) => {
      const next = prev.filter((e) => savedEventIds.includes(e.id));
      return next.length === prev.length ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- savedKey stabilizes savedEventIds array identity
  }, [savedKey]);

  useEffect(() => {
    if (missingIds.length === 0) {
      setHydrating(false);
      return;
    }

    let cancelled = false;
    setHydrating(true);
    setHydrateError(null);

    fetchEventsByIds(missingIds)
      .then((result) => {
        if (cancelled) return;
        setHydratedEvents((prev) => {
          const map = new Map(prev.map((e) => [e.id, e]));
          for (const event of result.events) {
            map.set(event.id, event);
          }
          return [...map.values()].filter((e) => savedEventIds.includes(e.id));
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof EventsFetchError && err.authError) {
          setHydrateError('API key required to load saved events.');
          return;
        }
        setHydrateError(err instanceof Error ? err.message : 'Failed to load saved events');
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable string keys avoid infinite refetch from array identity
  }, [missingIds.join(','), savedKey]);

  return { savedHydratedEvents: hydratedEvents, savedHydrating: hydrating, savedHydrateError: hydrateError };
}
