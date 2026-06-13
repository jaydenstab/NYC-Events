import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NuqsAdapter } from 'nuqs/adapters/react';
import { useAppUrlState } from './useAppUrlState';

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(NuqsAdapter, null, children);
}

describe('useAppUrlState', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('defaults sort to date and borough to all', () => {
    const { result } = renderHook(() => useAppUrlState(), { wrapper });
    expect(result.current.sort).toBe('date');
    expect(result.current.selectedBorough).toBe('all');
  });

  it('round-trips sort param', () => {
    window.history.replaceState({}, '', '/?sort=distance');
    const { result } = renderHook(() => useAppUrlState(), { wrapper });
    expect(result.current.sort).toBe('distance');

    act(() => {
      result.current.setSort('relevance');
    });
    expect(result.current.sort).toBe('relevance');
  });

  it('round-trips borough param', () => {
    window.history.replaceState({}, '', '/?borough=Brooklyn');
    const { result } = renderHook(() => useAppUrlState(), { wrapper });
    expect(result.current.selectedBorough).toBe('Brooklyn');

    act(() => {
      result.current.setSelectedBorough('Manhattan');
    });
    expect(result.current.selectedBorough).toBe('Manhattan');
  });

  it('round-trips price and time params', () => {
    window.history.replaceState({}, '', '/?price=free&time=evening');
    const { result } = renderHook(() => useAppUrlState(), { wrapper });
    expect(result.current.selectedPrice).toBe('free');
    expect(result.current.selectedTimeOfDay).toBe('evening');
  });

  it('round-trips tab param', () => {
    window.history.replaceState({}, '', '/?tab=saved');
    const { result } = renderHook(() => useAppUrlState(), { wrapper });
    expect(result.current.activeTab).toBe('saved');

    act(() => {
      result.current.setActiveTab('profile');
    });
    expect(result.current.activeTab).toBe('profile');
  });

  it('clearAllFilters resets sort and borough', () => {
    window.history.replaceState({}, '', '/?sort=distance&borough=Queens&q=test&price=free&time=morning');
    const { result } = renderHook(() => useAppUrlState(), { wrapper });

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.sort).toBe('date');
    expect(result.current.selectedBorough).toBe('all');
    expect(result.current.selectedPrice).toBe('all');
    expect(result.current.selectedTimeOfDay).toBe('all');
    expect(result.current.searchQuery).toBe('');
  });
});
