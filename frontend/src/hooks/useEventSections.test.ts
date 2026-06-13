import { describe, it, expect } from 'vitest';
import { buildEventSections } from '@/lib/eventSections';
import type { Event } from '@/types/Event';

function isoDaysFromToday(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function makeEvent(id: string, date: string | null): Event {
  return {
    id,
    name: `Event ${id}`,
    category: 'music',
    lat: 40.75,
    lng: -73.99,
    address: 'Manhattan, NY',
    time: '8pm',
    date,
    price: 'Free',
    description: 'Test',
  };
}

describe('buildEventSections', () => {
  it('always includes Tonight and Coming up when data exists', () => {
    const weekendOffset = (() => {
      const day = new Date().getDay();
      if (day === 5) return 1;
      if (day === 6) return 0;
      if (day === 0) return 1;
      return 6 - day;
    })();
    const weekendDate = isoDaysFromToday(weekendOffset);

    const events = [
      makeEvent('w1', weekendDate),
      makeEvent('later', isoDaysFromToday(14)),
    ];

    const sections = buildEventSections(events, 4);
    expect(sections.some((s) => s.id === 'tonight')).toBe(true);
    expect(sections.some((s) => s.id === 'weekend')).toBe(true);
    expect(sections.some((s) => s.id === 'later')).toBe(true);
  });

  it('includes tonight section even when empty', () => {
    const sections = buildEventSections([makeEvent('later', isoDaysFromToday(10))], 4);
    expect(sections.find((s) => s.id === 'tonight')).toBeDefined();
  });

  it('caps preview events per section', () => {
    const tonight = isoDaysFromToday(0);
    const events = Array.from({ length: 6 }, (_, i) => makeEvent(`e${i}`, tonight));
    const sections = buildEventSections(events, 4);
    const tonightSection = sections.find((s) => s.id === 'tonight');
    expect(tonightSection?.events).toHaveLength(4);
  });
});
