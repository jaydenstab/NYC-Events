import type { Event } from '@/types/Event';

function parseDateTime(event: Event): { start: Date | null; end: Date | null } {
  if (!event.date || event.date === 'TBD') return { start: null, end: null };

  const datePart = event.date.split('T')[0];
  let hours = 19;
  let minutes = 0;

  if (event.time && event.time !== 'TBD') {
    const match = event.time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = match[2] ? parseInt(match[2], 10) : 0;
      const ampm = match[3]?.toLowerCase();
      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
    }
  }

  const start = new Date(`${datePart}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  if (Number.isNaN(start.getTime())) return { start: null, end: null };

  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  return { start, end };
}

function toGoogleDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function canAddToCalendar(event: Event): boolean {
  return parseDateTime(event).start !== null;
}

export function buildGoogleCalendarUrl(event: Event): string {
  const { start, end } = parseDateTime(event);
  if (!start || !end) return '';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.name,
    dates: `${toGoogleDate(start)}/${toGoogleDate(end)}`,
    details: event.description || '',
    location: event.address || 'New York, NY',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function buildIcsContent(event: Event): string | null {
  const { start, end } = parseDateTime(event);
  if (!start || !end) return null;

  const uid = `${event.id}@whatsupnyc`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WhatsUpNYC//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${toGoogleDate(start)}`,
    `DTEND:${toGoogleDate(end)}`,
    `SUMMARY:${escapeIcs(event.name)}`,
    `DESCRIPTION:${escapeIcs(event.description || '')}`,
    `LOCATION:${escapeIcs(event.address || 'New York, NY')}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(event: Event): void {
  const content = buildIcsContent(event);
  if (!content) return;

  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${event.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
