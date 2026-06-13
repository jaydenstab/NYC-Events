import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useEventFiltering } from './useEventFiltering';
import type { Event } from '@/types/Event';

const events: Event[] = [
  {
    id: '1',
    name: 'Jazz',
    category: 'music',
    lat: 40.7,
    lng: -74,
    address: 'NY',
    time: '8pm',
    date: '2026-06-12',
    price: 'Free',
    description: '',
  },
  {
    id: '2',
    name: 'Comedy',
    category: 'comedy',
    lat: 40.7,
    lng: -74,
    address: 'NY',
    time: '9pm',
    date: '2026-06-15',
    price: '$10',
    description: '',
  },
];

describe('useEventFiltering', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('filters by category', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00'));
    const { result } = renderHook(() =>
      useEventFiltering(events, 'music', 'all', [])
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Jazz');
  });

  it('filters saved events', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00'));
    const { result } = renderHook(() =>
      useEventFiltering(events, 'saved', 'all', ['2'])
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('2');
  });

  it('filters this week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00')); // Thursday
    const { result } = renderHook(() =>
      useEventFiltering(events, 'all', 'week', [])
    );
    expect(result.current.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by free price', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00'));
    const priced: Event[] = [
      { ...events[0], id: 'f', price: 'Free' },
      { ...events[1], id: 'p', price: '$10' },
    ];
    const { result } = renderHook(() =>
      useEventFiltering(priced, 'all', 'all', [], 'all', 'free', 'all')
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('f');
  });

  it('filters tonight (today)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T20:00:00'));
    const tonightEvents: Event[] = [
      { ...events[0], id: 't1', date: '2026-06-12' },
      { ...events[1], id: 't2', date: '2026-06-13' },
    ];
    const { result } = renderHook(() =>
      useEventFiltering(tonightEvents, 'all', 'today', [])
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('t1');
  });

  it('filters this weekend including current Saturday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-13T12:00:00')); // Saturday
    const weekendEvents: Event[] = [
      { ...events[0], id: 'sat', date: '2026-06-13' },
      { ...events[1], id: 'mon', date: '2026-06-15' },
      { ...events[0], id: 'nextfri', date: '2026-06-19' },
    ];
    const { result } = renderHook(() =>
      useEventFiltering(weekendEvents, 'all', 'weekend', [])
    );
    expect(result.current.map((e) => e.id)).toContain('sat');
    expect(result.current.map((e) => e.id)).not.toContain('mon');
    expect(result.current.map((e) => e.id)).not.toContain('nextfri');
  });

  it('filters this weekend on Sunday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-14T12:00:00')); // Sunday
    const weekendEvents: Event[] = [
      { ...events[0], id: 'sun', date: '2026-06-14' },
      { ...events[1], id: 'mon', date: '2026-06-15' },
    ];
    const { result } = renderHook(() =>
      useEventFiltering(weekendEvents, 'all', 'weekend', [])
    );
    expect(result.current.map((e) => e.id)).toContain('sun');
    expect(result.current.map((e) => e.id)).not.toContain('mon');
  });

  it('filters by borough from address', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00'));
    const boroughEvents: Event[] = [
      { ...events[0], id: 'm', address: '123 Broadway, Manhattan, NY' },
      { ...events[1], id: 'b', address: '456 Bedford Ave, Brooklyn, NY' },
    ];
    const { result } = renderHook(() =>
      useEventFiltering(boroughEvents, 'all', 'all', [], 'Brooklyn')
    );
    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('b');
  });
});
