import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMapPreferences } from './useMapPreferences';

const STORAGE_KEY = 'whatsupnyc_map_prefs';

describe('useMapPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads defaults when storage is empty', () => {
    const { result } = renderHook(() => useMapPreferences());
    expect(result.current.appearance).toBe('light');
    expect(result.current.is3D).toBe(true);
  });

  it('persists appearance to localStorage', () => {
    const { result } = renderHook(() => useMapPreferences());

    act(() => {
      result.current.setAppearance('dark');
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored).toEqual({ appearance: 'dark', is3D: true });
  });

  it('persists is3D preference', () => {
    const { result } = renderHook(() => useMapPreferences());

    act(() => {
      result.current.setIs3D(false);
    });

    expect(result.current.is3D).toBe(false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.is3D).toBe(false);
  });

  it('migrates legacy satellite mapStyle', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mapStyle: 'satellite', lightPreset: 'day', is3D: true })
    );
    const { result } = renderHook(() => useMapPreferences());
    expect(result.current.appearance).toBe('satellite');
    expect(result.current.is3D).toBe(true);
  });

  it('migrates legacy dark mapStyle and night lighting', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mapStyle: 'streets', lightPreset: 'night' })
    );
    const { result } = renderHook(() => useMapPreferences());
    expect(result.current.appearance).toBe('dark');
  });

  it('migrates legacy dawn/dusk to light', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ mapStyle: 'streets', lightPreset: 'dusk' })
    );
    const { result } = renderHook(() => useMapPreferences());
    expect(result.current.appearance).toBe('light');
  });

  it('rejects invalid appearance values', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ appearance: 'neon' }));
    const { result } = renderHook(() => useMapPreferences());
    expect(result.current.appearance).toBe('light');
  });
});
