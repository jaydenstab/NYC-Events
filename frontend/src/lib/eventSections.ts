import type { Event } from '@/types/Event';

export type EventSectionId = 'tonight' | 'weekend' | 'later' | 'undated';

export interface EventSection {
  id: EventSectionId;
  title: string;
  events: Event[];
  viewAllWhen?: 'today' | 'weekend';
  viewAllComingUp?: boolean;
  totalCount?: number;
}

const PREVIEW_CAP = 4;

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekendWindow(now: Date): { friIso: string; sunIso: string } {
  const day = now.getDay();
  const fri = new Date(now);
  if (day === 0) {
    fri.setDate(now.getDate() - 2);
  } else if (day === 6) {
    fri.setDate(now.getDate() - 1);
  } else if (day !== 5) {
    const daysUntilFri = (5 - day + 7) % 7;
    fri.setDate(now.getDate() + daysUntilFri);
  }
  const sun = new Date(fri);
  sun.setDate(fri.getDate() + 2);
  return { friIso: toLocalDateString(fri), sunIso: toLocalDateString(sun) };
}

function isTonight(event: Event, todayIso: string): boolean {
  if (!event.date) return false;
  return event.date.split('T')[0] === todayIso;
}

function isWeekendEvent(event: Event, friIso: string, sunIso: string): boolean {
  if (!event.date) return false;
  const eDate = event.date.split('T')[0];
  const d = new Date(`${eDate}T00:00:00`);
  const day = d.getDay();
  if (!(day === 0 || day === 5 || day === 6)) return false;
  return eDate >= friIso && eDate <= sunIso;
}

function isUndated(event: Event): boolean {
  if (!event.date) return true;
  const trimmed = event.date.trim();
  return !trimmed || trimmed === 'TBD' || trimmed === 'Unknown';
}

export function buildEventSections(events: Event[], cap = PREVIEW_CAP): EventSection[] {
  const now = new Date();
  const todayIso = toLocalDateString(now);
  const { friIso, sunIso } = getWeekendWindow(now);

  const tonight: Event[] = [];
  const weekend: Event[] = [];
  const later: Event[] = [];
  const undated: Event[] = [];

  for (const event of events) {
    if (isUndated(event)) {
      undated.push(event);
      continue;
    }
    if (isTonight(event, todayIso)) {
      tonight.push(event);
    } else if (isWeekendEvent(event, friIso, sunIso)) {
      weekend.push(event);
    } else {
      later.push(event);
    }
  }

  const sections: EventSection[] = [];

  sections.push({
    id: 'tonight',
    title: 'Tonight',
    events: tonight.slice(0, cap),
    viewAllWhen: 'today',
    totalCount: tonight.length,
  });

  if (weekend.length > 0) {
    sections.push({
      id: 'weekend',
      title: 'This weekend',
      events: weekend.slice(0, cap),
      viewAllWhen: 'weekend',
      totalCount: weekend.length,
    });
  }

  if (later.length > 0) {
    sections.push({
      id: 'later',
      title: 'Coming up',
      events: later.slice(0, cap),
      viewAllComingUp: true,
      totalCount: later.length,
    });
  }

  if (undated.length > 0 && tonight.length === 0 && weekend.length === 0 && later.length === 0) {
    sections.push({
      id: 'undated',
      title: 'Coming soon',
      events: undated.slice(0, cap),
      totalCount: undated.length,
    });
  }

  return sections;
}

export { PREVIEW_CAP };
