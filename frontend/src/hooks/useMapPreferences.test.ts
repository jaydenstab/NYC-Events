import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppPreferences } from './useAppPreferences';

const STORAGE_KEY = 'whatsupnyc_app_prefs';
const LEGACY_KEY = 'whatsupnyc_map_prefs';

describe('useMapPreferences (compat re-export)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads defaults when storage is empty', () => {
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.mapAppearance).toBe('light');
    expect(result.current.is3D).toBe(true);
  });

  it('persists map appearance to localStorage', () => {
    const { result } = renderHook(() => useAppPreferences());

    act(() => {
      result.current.setMapAppearance('dark');
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.mapAppearance).toBe('dark');
    expect(stored.is3D).toBe(true);
  });

  it('persists is3D preference', () => {
    const { result } = renderHook(() => useAppPreferences());

    act(() => {
      result.current.setIs3D(false);
    });

    expect(result.current.is3D).toBe(false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.is3D).toBe(false);
  });

  it('migrates legacy satellite mapStyle', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ mapStyle: 'satellite', lightPreset: 'day', is3D: true })
    );
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.mapAppearance).toBe('satellite');
    expect(result.current.is3D).toBe(true);
  });

  it('migrates legacy dark mapStyle and night lighting', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ mapStyle: 'streets', lightPreset: 'night' })
    );
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.mapAppearance).toBe('dark');
  });

  it('migrates legacy dawn/dusk to light', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ mapStyle: 'streets', lightPreset: 'dusk' })
    );
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.mapAppearance).toBe('light');
  });

  it('rejects invalid map appearance values', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mapAppearance: 'neon' }));
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.mapAppearance).toBe('light');
  });
});
