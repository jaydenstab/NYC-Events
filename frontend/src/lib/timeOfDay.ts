export type TimeOfDayFilter = 'all' | 'morning' | 'afternoon' | 'evening';

export function parseEventHour(time: string | null | undefined): number | null {
  if (!time || time === 'TBD') return null;
  const trimmed = time.trim().toLowerCase();

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    return h >= 0 && h <= 23 ? h : null;
  }

  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const meridiem = match12[3];
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    return h;
  }

  const hourOnly = trimmed.match(/^(\d{1,2})\s*(am|pm)$/);
  if (hourOnly) {
    let h = parseInt(hourOnly[1], 10);
    const meridiem = hourOnly[2];
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    return h;
  }

  return null;
}

export function hourToTimeOfDay(hour: number): Exclude<TimeOfDayFilter, 'all'> {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function matchesTimeOfDayFilter(
  time: string | null | undefined,
  filter: TimeOfDayFilter
): boolean {
  if (filter === 'all') return true;
  const hour = parseEventHour(time);
  if (hour == null) return true;
  return hourToTimeOfDay(hour) === filter;
}

export function getTimeOfDayLabel(filter: TimeOfDayFilter): string {
  if (filter === 'morning') return 'Morning';
  if (filter === 'afternoon') return 'Afternoon';
  if (filter === 'evening') return 'Evening';
  return 'Any time';
}
