import { useState, useEffect, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'whatsupnyc_app_prefs';
const LEGACY_STORAGE_KEY = 'whatsupnyc_map_prefs';

export type AppTheme = 'dark' | 'light' | 'system';
export type MapAppearance = 'light' | 'dark' | 'satellite';
export type ResolvedAppTheme = 'dark' | 'light';

const APP_THEMES = new Set<AppTheme>(['dark', 'light', 'system']);
const MAP_APPEARANCES = new Set<MapAppearance>(['light', 'dark', 'satellite']);

export interface AppPreferences {
  appTheme: AppTheme;
  mapAppearance: MapAppearance;
  is3D: boolean;
}

const DEFAULTS: AppPreferences = {
  appTheme: 'light',
  mapAppearance: 'light',
  is3D: true,
};

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function migrateLegacyMapAppearance(parsed: Record<string, unknown>): MapAppearance {
  if (
    typeof parsed.mapAppearance === 'string' &&
    MAP_APPEARANCES.has(parsed.mapAppearance as MapAppearance)
  ) {
    return parsed.mapAppearance as MapAppearance;
  }
  if (typeof parsed.appearance === 'string' && MAP_APPEARANCES.has(parsed.appearance as MapAppearance)) {
    return parsed.appearance as MapAppearance;
  }

  const mapStyle = typeof parsed.mapStyle === 'string' ? parsed.mapStyle : '';
  const lightPreset = typeof parsed.lightPreset === 'string' ? parsed.lightPreset : '';

  if (mapStyle === 'satellite') return 'satellite';
  if (mapStyle === 'dark' || lightPreset === 'night') return 'dark';
  return 'light';
}

function load(): AppPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as Record<string, unknown>;
        return {
          appTheme: DEFAULTS.appTheme,
          mapAppearance: migrateLegacyMapAppearance(parsed),
          is3D: typeof parsed.is3D === 'boolean' ? parsed.is3D : DEFAULTS.is3D,
        };
      }
      return { ...DEFAULTS };
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const appTheme =
      typeof parsed.appTheme === 'string' && APP_THEMES.has(parsed.appTheme as AppTheme)
        ? (parsed.appTheme as AppTheme)
        : DEFAULTS.appTheme;

    return {
      appTheme,
      mapAppearance: migrateLegacyMapAppearance(parsed),
      is3D: typeof parsed.is3D === 'boolean' ? parsed.is3D : DEFAULTS.is3D,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function resolveAppTheme(appTheme: AppTheme): ResolvedAppTheme {
  if (appTheme === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return appTheme;
}

export function useAppPreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(load);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedAppTheme = useMemo(() => {
    if (prefs.appTheme === 'system') {
      return systemDark ? 'dark' : 'light';
    }
    return prefs.appTheme;
  }, [prefs.appTheme, systemDark]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const setAppTheme = useCallback((appTheme: AppTheme) => {
    setPrefs((p) => ({ ...p, appTheme }));
  }, []);

  const setMapAppearance = useCallback((mapAppearance: MapAppearance) => {
    setPrefs((p) => ({ ...p, mapAppearance }));
  }, []);

  const setIs3D = useCallback((is3D: boolean) => {
    setPrefs((p) => ({ ...p, is3D }));
  }, []);

  return {
    appTheme: prefs.appTheme,
    resolvedAppTheme,
    mapAppearance: prefs.mapAppearance,
    is3D: prefs.is3D,
    setAppTheme,
    setMapAppearance,
    setIs3D,
    /** @deprecated use mapAppearance */
    appearance: prefs.mapAppearance,
    /** @deprecated use setMapAppearance */
    setAppearance: setMapAppearance,
  };
}
