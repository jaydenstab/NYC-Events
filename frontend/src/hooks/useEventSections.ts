import { useMemo } from 'react';
import type { Event } from '@/types/Event';
import { buildEventSections, type EventSection } from '@/lib/eventSections';

export function useEventSections(events: Event[], cap?: number): EventSection[] {
  return useMemo(() => buildEventSections(events, cap), [events, cap]);
}

export type { EventSection };
