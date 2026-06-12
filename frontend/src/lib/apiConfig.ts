/**
 * API base for fetches. Empty string = same-origin (Vite proxy in dev, paired deploy in prod).
 */
export function getApiBaseUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (base === undefined || base === '') return '';
  return base.replace(/\/$/, '');
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (!base) return normalized;
  return `${base}${normalized}`;
}

/** Public read key — visible in the browser bundle; use only for private deployments. */
export function getApiKey(): string {
  return (import.meta.env.VITE_API_KEY as string | undefined)?.trim() || '';
}

export function apiAuthHeaders(): HeadersInit {
  const key = getApiKey();
  if (!key) return {};
  return { 'x-api-key': key };
}
