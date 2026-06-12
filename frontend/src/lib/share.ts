import type { Event } from '@/types/Event';

export function buildEventShareUrl(eventId: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set('event', eventId);
  return url.toString();
}

export interface ShareResult {
  method: 'native' | 'clipboard' | 'failed';
}

export async function shareEvent(event: Event): Promise<ShareResult> {
  const url = buildEventShareUrl(event.id);
  const text = `Check out this event in NYC: ${event.name}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: event.name, text, url });
      return { method: 'native' };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return { method: 'failed' };
      }
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return { method: 'clipboard' };
  } catch {
    return { method: 'failed' };
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
