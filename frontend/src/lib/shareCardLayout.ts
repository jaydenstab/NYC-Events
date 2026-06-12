import { categoryConfig } from '@/types/Event';
import type { Event } from '@/types/Event';
import { formatRelativeDate } from '@/lib/dateFormat';
import { parseBorough } from '@/lib/borough';

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;
export const BRAND_COLOR = '#2563eb';
export const BRAND_NAME = 'WhatsUpNYC';

export interface ShareCardContent {
  title: string;
  dateLine: string;
  locationLine: string;
  categoryColor: string;
  categoryLabel: string;
}

export function buildShareCardContent(event: Event): ShareCardContent {
  const config = categoryConfig[event.category] || categoryConfig.other;
  const borough = event.borough || parseBorough(event.address) || 'NYC';
  const datePart = formatRelativeDate(event.date);
  const timePart = event.time && event.time !== 'TBD' ? ` · ${event.time}` : '';

  return {
    title: event.name,
    dateLine: `${datePart}${timePart}`,
    locationLine: borough,
    categoryColor: config.color,
    categoryLabel: event.category,
  };
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildShareCardSvg(event: Event): string {
  const c = buildShareCardContent(event);
  const title =
    c.title.length > 60 ? `${c.title.slice(0, 57)}…` : c.title;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_CARD_WIDTH}" height="${SHARE_CARD_HEIGHT}" viewBox="0 0 ${SHARE_CARD_WIDTH} ${SHARE_CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="100%" fill="${c.categoryColor}"/>
  <text x="80" y="120" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="28" font-weight="600">${escapeXml(c.categoryLabel.toUpperCase())}</text>
  <text x="80" y="220" fill="#ffffff" font-family="system-ui,sans-serif" font-size="56" font-weight="700">${escapeXml(title)}</text>
  <text x="80" y="300" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="32">${escapeXml(c.dateLine)}</text>
  <text x="80" y="360" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="28">${escapeXml(c.locationLine)}</text>
  <text x="80" y="560" fill="${BRAND_COLOR}" font-family="system-ui,sans-serif" font-size="36" font-weight="700">${BRAND_NAME}</text>
</svg>`;
}
