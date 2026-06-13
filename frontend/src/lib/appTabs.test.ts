import { describe, it, expect } from 'vitest';
import { formatSavedBadgeCount } from './appTabs';

describe('appTabs', () => {
  it('formats saved badge counts', () => {
    expect(formatSavedBadgeCount(0)).toBe('');
    expect(formatSavedBadgeCount(5)).toBe('5');
    expect(formatSavedBadgeCount(100)).toBe('99+');
  });
});
