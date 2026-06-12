/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_MAPBOX_ACCESS_TOKEN: string;
  readonly VITE_API_KEY?: string;
  readonly VITE_EVENTS_PER_PAGE?: string;
  readonly VITE_DEMO_FALLBACK_MIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
