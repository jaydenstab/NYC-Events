import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import type { Event } from '@/types/Event';
import App from './App';

const fitBoundsToEvents = vi.fn();
const flyToEvent = vi.fn();
const setHighlightedId = vi.fn();
const focusSearch = vi.fn();

const mockEvents: Event[] = [
  {
    id: 'e1',
    name: 'Test Event',
    category: 'music',
    lat: 40.75,
    lng: -73.99,
    address: 'Manhattan, NY',
    time: '8pm',
    date: '2099-01-01',
    price: 'Free',
    description: 'Test',
  },
];

vi.mock('@/components/NYC3DMap', () => ({
  default: React.forwardRef(function MockMap(_props: unknown, ref: React.Ref<unknown>) {
    React.useImperativeHandle(ref, () => ({
      flyToEvent,
      setHighlightedId,
      fitBoundsToEvents,
      resize: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      resetNorth: vi.fn(),
    }));
    return <div data-testid="mock-map" />;
  }),
}));

vi.mock('@/components/EventsPanel', () => ({
  default: React.forwardRef(function MockPanel(_props: unknown, ref: React.Ref<unknown>) {
    React.useImperativeHandle(ref, () => ({
      scrollToEventId: vi.fn(),
      scrollToTop: vi.fn(),
      setSheetSnap: vi.fn(),
      focusSearch,
    }));
    return <div data-testid="mock-panel" />;
  }),
}));

vi.mock('@/components/EventModal', () => ({
  default: () => null,
}));

vi.mock('@/hooks/useEventsData', () => ({
  useEventsData: () => ({
    events: mockEvents,
    loading: false,
    searchLoading: false,
    error: null,
    loadMoreError: null,
    apiMeta: {},
    dataSource: 'live' as const,
    demoReason: undefined,
    refetch: vi.fn(),
    loadMore: vi.fn(),
    hasMore: false,
    isLoadingMore: false,
  }),
}));

vi.mock('@/hooks/useSavedEventsHydration', () => ({
  useSavedEventsHydration: () => ({
    savedHydratedEvents: [],
    savedHydrating: false,
    savedHydrateError: null,
  }),
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOffline: false }),
}));

vi.mock('@/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ isMobile: false, width: 1200, height: 800 }),
}));

vi.mock('@/hooks/useSavedEvents', () => ({
  useSavedEvents: () => ({
    savedEventIds: [],
    toggleSaveEvent: vi.fn(),
    isEventSaved: () => false,
  }),
}));

vi.mock('@/lib/geo', () => ({
  useUserLocation: () => ({ location: null, status: 'denied', refresh: vi.fn() }),
  requestUserLocation: vi.fn(() => Promise.reject(new Error('denied'))),
  distanceMiles: vi.fn(() => 1),
  isApproximateCoords: vi.fn(() => false),
  NYC_DEFAULT: { lat: 40.75, lng: -73.99 },
}));

describe('App integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it('applies app theme class on shell', () => {
    const { container } = render(
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    );
    const shell = container.querySelector('.app-shell');
    expect(shell?.className).toMatch(/app-theme-(dark|light)/);
  });

  it('focuses search when / is pressed outside inputs', () => {
    render(
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    );

    fireEvent.keyDown(document.body, { key: '/' });
    expect(focusSearch).toHaveBeenCalled();
  });

  it('skips fitBounds when event is selected via URL', async () => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/?event=e1');

    render(
      <NuqsAdapter>
        <App />
      </NuqsAdapter>
    );

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(fitBoundsToEvents).not.toHaveBeenCalled();
    expect(flyToEvent).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
