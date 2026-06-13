import { describe, it, expect } from 'vitest';
import { buildEventShareUrl } from './share';

describe('share', () => {
  it('builds canonical share URL without filter params', () => {
    Object.defineProperty(window, 'location', {
      value: {
        origin: 'https://demo.example.com',
        pathname: '/',
        href: 'https://demo.example.com/?q=jazz&when=weekend',
      },
      writable: true,
    });

    const url = buildEventShareUrl('evt-123');
    expect(url).toBe('https://demo.example.com/?event=evt-123&utm_source=share');
    expect(url).not.toContain('q=jazz');
    expect(url).not.toContain('when=weekend');
  });
});
