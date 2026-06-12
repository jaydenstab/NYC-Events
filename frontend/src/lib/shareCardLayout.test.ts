import { describe, it, expect } from 'vitest';
import { buildShareCardSvg, buildShareCardContent } from './shareCardLayout';
import type { Event } from '@/types/Event';

const event: Event = {
  id: '1',
  name: 'Jazz Night',
  category: 'music',
  lat: 40.75,
  lng: -73.99,
  address: 'Brooklyn, NY',
  time: '8pm',
  date: '2099-01-01',
  price: 'Free',
  description: 'Live jazz',
};

describe('shareCardLayout', () => {
  it('builds card content', () => {
    const content = buildShareCardContent(event);
    expect(content.title).toBe('Jazz Night');
    expect(content.categoryLabel).toBe('music');
  });

  it('builds valid svg', () => {
    const svg = buildShareCardSvg(event);
    expect(svg).toContain('<svg');
    expect(svg).toContain('Jazz Night');
    expect(svg).toContain('WhatsUpNYC');
  });
});
