import { describe, it, expect } from 'vitest';
import { distanceMiles, formatDistanceMiles, isApproximateCoords, NYC_DEFAULT } from './geo';

describe('geo', () => {
  it('computes distance between two points', () => {
    const miles = distanceMiles(40.758, -73.9855, 40.7484, -73.9857);
    expect(miles).toBeGreaterThan(0.5);
    expect(miles).toBeLessThan(1);
  });

  it('formats distance', () => {
    expect(formatDistanceMiles(0.05)).toBe('< 0.1 mi');
    expect(formatDistanceMiles(2.34)).toBe('2.3 mi');
  });

  it('detects approximate default coords', () => {
    expect(isApproximateCoords(NYC_DEFAULT.lat, NYC_DEFAULT.lng, 'default')).toBe(true);
    expect(isApproximateCoords(40.75, -73.99)).toBe(false);
  });
});
