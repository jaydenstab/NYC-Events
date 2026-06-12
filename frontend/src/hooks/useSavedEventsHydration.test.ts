import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSavedEventsHydration } from './useSavedEventsHydration';
import { fetchEventsByIds } from '@/services/api';
import type { Event } from '@/types/Event';

vi.mock('@/services/api', () => ({
  fetchEventsByIds: vi.fn(),
  EventsFetchError: class EventsFetchError extends Error {
    authError = false;
  },
}));

const catalogEvent: Event = {
  id: 'in-catalog',
  name: 'Catalog',
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'NYC',
  time: '8pm',
  date: '2099-01-01',
  price: 'Free',
  description: 'Test',
};

const savedEvent: Event = {
  ...catalogEvent,
  id: 'saved-only',
  name: 'Saved only',
};

describe('useSavedEventsHydration', () => {
  beforeEach(() => {
    vi.mocked(fetchEventsByIds).mockResolvedValue({
      events: [savedEvent],
      meta: { totalCount: 1, idsMode: true },
      dataSource: 'live',
    });
  });

  it('fetches ids missing from catalog', async () => {
    const { result } = renderHook(() =>
      useSavedEventsHydration(['in-catalog', 'saved-only'], [catalogEvent])
    );

    await waitFor(() => {
      expect(result.current.savedHydrating).toBe(false);
    });

    expect(fetchEventsByIds).toHaveBeenCalledWith(['saved-only']);
    expect(result.current.savedHydratedEvents.some((e) => e.id === 'saved-only')).toBe(true);
  });
});
