import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeDate, formatDateTimeLine } from './dateFormat';

describe('dateFormat', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns Tonight for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00'));
    expect(formatRelativeDate('2026-06-12')).toBe('Tonight');
  });

  it('returns Tomorrow for next day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00'));
    expect(formatRelativeDate('2026-06-13')).toBe('Tomorrow');
  });

  it('formats date time line', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-12T12:00:00'));
    expect(formatDateTimeLine('2026-06-12', '8:00 PM')).toBe('Tonight · 8:00 PM');
  });
});
