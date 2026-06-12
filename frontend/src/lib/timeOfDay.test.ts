import { describe, it, expect } from 'vitest';
import { parseEventHour, matchesTimeOfDayFilter, hourToTimeOfDay } from './timeOfDay';

describe('timeOfDay', () => {
  it('parses 12h and 24h times', () => {
    expect(parseEventHour('8pm')).toBe(20);
    expect(parseEventHour('10:30')).toBe(10);
    expect(parseEventHour('TBD')).toBeNull();
  });

  it('maps hours to buckets', () => {
    expect(hourToTimeOfDay(9)).toBe('morning');
    expect(hourToTimeOfDay(14)).toBe('afternoon');
    expect(hourToTimeOfDay(20)).toBe('evening');
  });

  it('includes TBD times when filtering', () => {
    expect(matchesTimeOfDayFilter('TBD', 'evening')).toBe(true);
    expect(matchesTimeOfDayFilter('8pm', 'evening')).toBe(true);
    expect(matchesTimeOfDayFilter('8am', 'evening')).toBe(false);
  });
});
