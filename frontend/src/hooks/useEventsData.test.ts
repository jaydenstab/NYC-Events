import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEventsData } from './useEventsData';
import { loadEventsWithFallback, fetchEvents } from '@/services/api';
import type { Event } from '@/types/Event';

vi.mock('@/services/api', () => ({
  loadEventsWithFallback: vi.fn(),
  fetchEvents: vi.fn(),
  EventsFetchError: class EventsFetchError extends Error {
    authError = false;
  },
}));

const mockEvent = (id: string): Event => ({
  id,
  name: `Event ${id}`,
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'NYC',
  time: '8pm',
  date: '2099-01-01',
  price: 'Free',
  description: 'Test',
});

describe('useEventsData', () => {
  beforeEach(() => {
    vi.mocked(loadEventsWithFallback).mockResolvedValue({
      events: [mockEvent('1')],
      meta: { totalCount: 200 },
      dataSource: 'live',
    });
    vi.mocked(fetchEvents).mockResolvedValue({
      events: [mockEvent('2')],
      meta: { totalCount: 200 },
      dataSource: 'live',
    });
  });

  it('loads initial page and exposes hasMore when catalog is larger', async () => {
    const { result } = renderHook(() => useEventsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(loadEventsWithFallback).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1 })
    );
    expect(result.current.events).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore appends events and dedupes by id', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({
      events: [mockEvent('2'), mockEvent('1')],
      meta: { totalCount: 200 },
      dataSource: 'live',
    });

    const { result } = renderHook(() => useEventsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(fetchEvents).toHaveBeenCalledWith({ page: 2, paginate: true });
    expect(result.current.events.map((e) => e.id)).toEqual(['1', '2']);
  });

  it('sets hasMore false when append returns empty page', async () => {
    vi.mocked(fetchEvents).mockResolvedValueOnce({
      events: [],
      meta: { totalCount: 200 },
      dataSource: 'live',
    });

    const { result } = renderHook(() => useEventsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.hasMore).toBe(false);
    expect(result.current.events).toHaveLength(1);
  });

  it('sets loadMoreError on failed loadMore without clearing events', async () => {
    vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('Network failed'));

    const { result } = renderHook(() => useEventsData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.loadMoreError).toMatch(/Network failed/i);
    expect(result.current.events).toHaveLength(1);
  });
});
