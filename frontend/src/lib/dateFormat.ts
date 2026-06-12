function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseEventDate(date: string | null): Date | null {
  if (!date || date === 'TBD') return null;
  const parsed = new Date(`${date.split('T')[0]}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatRelativeDate(date: string | null): string {
  const parsed = parseEventDate(date);
  if (!parsed) return 'Date TBD';

  const now = new Date();
  const today = toLocalDate(now);
  const eventDay = toLocalDate(parsed);

  if (eventDay === today) return 'Tonight';

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (eventDay === toLocalDate(tomorrow)) return 'Tomorrow';

  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatEventTime(time: string): string {
  if (!time || time === 'TBD') return 'Time TBD';
  return time;
}

export function formatDateTimeLine(date: string | null, time: string): string {
  const rel = formatRelativeDate(date);
  const t = formatEventTime(time);
  if (rel === 'Date TBD' && t === 'Time TBD') return 'Date & time TBD';
  if (t === 'Time TBD') return rel;
  return `${rel} · ${t}`;
}

export function formatModalDate(date: string | null): string {
  const parsed = parseEventDate(date);
  if (!parsed) return 'Date TBD';
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function toLocalDateString(d: Date): string {
  return toLocalDate(d);
}

export function formatRelativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = Date.now() - parsed.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
