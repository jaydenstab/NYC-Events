import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'whatsupnyc_map_prefs';

export type MapAppearance = 'light' | 'dark' | 'satellite';

const APPEARANCES = new Set<MapAppearance>(['light', 'dark', 'satellite']);

export interface MapPreferences {
  appearance: MapAppearance;
  is3D: boolean;
}

const DEFAULTS: MapPreferences = {
  appearance: 'light',
  is3D: true,
};

function migrateLegacyAppearance(parsed: Record<string, unknown>): MapAppearance {
  if (typeof parsed.appearance === 'string' && APPEARANCES.has(parsed.appearance as MapAppearance)) {
    return parsed.appearance as MapAppearance;
  }

  const mapStyle = typeof parsed.mapStyle === 'string' ? parsed.mapStyle : '';
  const lightPreset = typeof parsed.lightPreset === 'string' ? parsed.lightPreset : '';

  if (mapStyle === 'satellite') return 'satellite';
  if (mapStyle === 'dark' || lightPreset === 'night') return 'dark';
  return 'light';
}

function load(): MapPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      appearance: migrateLegacyAppearance(parsed),
      is3D: typeof parsed.is3D === 'boolean' ? parsed.is3D : DEFAULTS.is3D,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function useMapPreferences() {
  const [prefs, setPrefs] = useState<MapPreferences>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const setAppearance = useCallback((appearance: MapAppearance) => {
    setPrefs((p) => ({ ...p, appearance }));
  }, []);

  const setIs3D = useCallback((is3D: boolean) => {
    setPrefs((p) => ({ ...p, is3D }));
  }, []);

  return {
    appearance: prefs.appearance,
    is3D: prefs.is3D,
    setAppearance,
    setIs3D,
  };
}
