import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppPreferences, resolveAppTheme } from './useAppPreferences';

const STORAGE_KEY = 'whatsupnyc_app_prefs';
const LEGACY_KEY = 'whatsupnyc_map_prefs';

describe('useAppPreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads defaults when storage is empty', () => {
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.appTheme).toBe('light');
    expect(result.current.mapAppearance).toBe('light');
    expect(result.current.is3D).toBe(true);
    expect(result.current.resolvedAppTheme).toBe('light');
  });

  it('persists app theme and map appearance', () => {
    const { result } = renderHook(() => useAppPreferences());

    act(() => {
      result.current.setAppTheme('light');
      result.current.setMapAppearance('dark');
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    expect(stored.appTheme).toBe('light');
    expect(stored.mapAppearance).toBe('dark');
  });

  it('migrates legacy map prefs storage', () => {
    localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ mapStyle: 'satellite', is3D: false })
    );
    const { result } = renderHook(() => useAppPreferences());
    expect(result.current.mapAppearance).toBe('satellite');
    expect(result.current.is3D).toBe(false);
    expect(result.current.appTheme).toBe('light');
  });

  it('resolves system theme', () => {
    expect(resolveAppTheme('dark')).toBe('dark');
    expect(resolveAppTheme('light')).toBe('light');
  });
});
