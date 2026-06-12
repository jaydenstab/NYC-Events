import { describe, expect, it } from 'vitest';
import { extractEventsArray, extractEventsMeta } from './apiResponse';

describe('extractEventsArray', () => {
  it('returns array from envelope', () => {
    const out = extractEventsArray({
      ok: true,
      events: [{ id: '1' }],
      meta: {},
    });
    expect(out).toEqual([{ id: '1' }]);
  });

  it('returns bare array', () => {
    expect(extractEventsArray([{ a: 1 }])).toEqual([{ a: 1 }]);
  });

  it('returns empty for invalid', () => {
    expect(extractEventsArray({})).toEqual([]);
    expect(extractEventsArray(null)).toEqual([]);
  });

  it('extracts meta from envelope', () => {
    const meta = extractEventsMeta({
      ok: true,
      events: [],
      meta: { semanticFallback: true, totalCount: 0 },
    });
    expect(meta.semanticFallback).toBe(true);
  });
});
