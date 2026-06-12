import { describe, expect, it } from 'vitest';
import { classifyEventLink, outboundLinkLabel } from './eventLink';

describe('eventLink', () => {
  it('classifies Google search URLs as search', () => {
    expect(
      classifyEventLink('https://www.google.com/search?q=jazz+nyc')
    ).toBe('search');
  });

  it('classifies ticket URLs as event', () => {
    expect(classifyEventLink('https://www.eventbrite.com/e/show-123')).toBe('event');
  });

  it('returns null for empty', () => {
    expect(classifyEventLink(null)).toBeNull();
  });

  it('maps labels by kind', () => {
    expect(outboundLinkLabel('search')).toBe('Search Web ↗');
    expect(outboundLinkLabel('event')).toBe('View Event ↗');
    expect(outboundLinkLabel(null)).toBe('Learn More');
  });
});
