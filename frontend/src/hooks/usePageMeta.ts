import { useEffect } from 'react';
import type { Event } from '@/types/Event';
import { apiUrl } from '@/lib/apiConfig';
import { buildEventShareUrl } from '@/lib/share';

const DEFAULT_TITLE = 'WhatsUpNYC - Live Event Discovery';
const DEFAULT_DESCRIPTION = 'Discover live events across New York City.';
const DEFAULT_OG_IMAGE = '/og-default.svg';

function setMetaTag(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function absoluteUrl(path: string): string {
  if (path.startsWith('http')) return path;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function usePageMeta(selectedEvent: Event | null) {
  useEffect(() => {
    if (selectedEvent) {
      document.title = `${selectedEvent.name} | WhatsUpNYC`;
      const desc =
        selectedEvent.description?.slice(0, 160) ||
        `${selectedEvent.name} in NYC — ${selectedEvent.address}`;
      const ogImage = absoluteUrl(
        apiUrl(`/api/og/event/${encodeURIComponent(selectedEvent.id)}.png`)
      );
      setMetaTag('property', 'og:title', selectedEvent.name);
      setMetaTag('property', 'og:description', desc);
      setMetaTag('property', 'og:image', ogImage);
      setMetaTag('property', 'og:url', buildEventShareUrl(selectedEvent.id));
      setMetaTag('name', 'description', desc);
      setMetaTag('name', 'twitter:card', 'summary_large_image');
      setMetaTag('name', 'twitter:title', selectedEvent.name);
      setMetaTag('name', 'twitter:description', desc);
      setMetaTag('name', 'twitter:image', ogImage);
    } else {
      document.title = DEFAULT_TITLE;
      setMetaTag('property', 'og:title', 'WhatsUpNYC');
      setMetaTag('property', 'og:description', DEFAULT_DESCRIPTION);
      setMetaTag('property', 'og:image', absoluteUrl(DEFAULT_OG_IMAGE));
      setMetaTag('property', 'og:url', absoluteUrl('/'));
      setMetaTag('name', 'description', DEFAULT_DESCRIPTION);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- granular fields listed; full object would re-run on every render
  }, [selectedEvent?.id, selectedEvent?.name, selectedEvent?.description, selectedEvent?.address]);
}
