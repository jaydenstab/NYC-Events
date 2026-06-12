import { describe, it, expect } from 'vitest';
import { parseBorough } from './borough';

describe('borough', () => {
  it('parses borough from address', () => {
    expect(parseBorough('123 Main St, Brooklyn, NY')).toBe('Brooklyn');
    expect(parseBorough('Central Park, Manhattan')).toBe('Manhattan');
    expect(parseBorough('Unknown place')).toBeNull();
  });
});
