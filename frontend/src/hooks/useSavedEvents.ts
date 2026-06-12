import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'whatsupnyc_saved_events';

function loadSavedIds(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Hook to manage saved event IDs with local storage persistence
 */
export function useSavedEvents() {
  const [savedEventIds, setSavedEventIds] = useState<string[]>(loadSavedIds);

  const savedSet = useMemo(() => new Set(savedEventIds), [savedEventIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedEventIds));
  }, [savedEventIds]);

  const toggleSaveEvent = useCallback((eventId: string) => {
    setSavedEventIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return [...next];
    });
  }, []);

  const isEventSaved = useCallback((eventId: string) => savedSet.has(eventId), [savedSet]);

  return { savedEventIds, savedSet, toggleSaveEvent, isEventSaved };
}
