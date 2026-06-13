import { describe, it, expect } from 'vitest';
import { decodeHtmlEntities } from './text';

describe('decodeHtmlEntities', () => {
  it('decodes ampersands in event titles', () => {
    expect(decodeHtmlEntities('Free Wine Tasting &amp; Pairing')).toBe('Free Wine Tasting & Pairing');
  });

  it('leaves plain text unchanged', () => {
    expect(decodeHtmlEntities('Konpa and Cocktail')).toBe('Konpa and Cocktail');
  });
});
