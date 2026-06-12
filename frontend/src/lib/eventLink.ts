export type EventLinkKind = 'event' | 'search';

const GOOGLE_SEARCH_HOST = 'google.com';

export function classifyEventLink(url: string | null | undefined): EventLinkKind | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (host.includes(GOOGLE_SEARCH_HOST) && parsed.pathname.includes('/search')) {
      return 'search';
    }
    return 'event';
  } catch {
    return trimmed.startsWith('http') ? 'event' : null;
  }
}

export function outboundLinkLabel(kind: EventLinkKind | null | undefined): string {
  if (kind === 'search') return 'Search Web ↗';
  if (kind === 'event') return 'View Event ↗';
  return 'Learn More';
}
