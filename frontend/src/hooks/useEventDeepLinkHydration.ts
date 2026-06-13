import { useEffect, useState } from 'react';
import { fetchEventsByIds, EventsFetchError } from '@/services/api';
import type { Event } from '@/types/Event';

export function useEventDeepLinkHydration(
  eventId: string | null,
  catalogEvents: Event[],
  catalogLoaded: boolean
) {
  const [hydratedEvent, setHydratedEvent] = useState<Event | null>(null);
  const [hydrating, setHydrating] = useState(false);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const catalogHasId = eventId
    ? catalogEvents.some((e) => e.id === eventId) || hydratedEvent?.id === eventId
    : false;

  useEffect(() => {
    if (!eventId) {
      setHydratedEvent(null);
      setHydrateError(null);
      setHydrating(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId || !catalogLoaded || catalogHasId) {
      setHydrating(false);
      return;
    }

    let cancelled = false;
    setHydrating(true);
    setHydrateError(null);

    fetchEventsByIds([eventId])
      .then((result) => {
        if (cancelled) return;
        const found = result.events.find((e) => e.id === eventId) ?? result.events[0] ?? null;
        setHydratedEvent(found);
        if (!found) {
          setHydrateError('Event not found');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setHydratedEvent(null);
        if (err instanceof EventsFetchError && err.authError) {
          setHydrateError('Could not load event — check API key configuration.');
        } else {
          setHydrateError(err instanceof Error ? err.message : 'Could not load event');
        }
      })
      .finally(() => {
        if (!cancelled) setHydrating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, catalogLoaded, catalogHasId, catalogEvents.length]);

  return { hydratedEvent, hydrating, hydrateError, catalogHasId };
}
