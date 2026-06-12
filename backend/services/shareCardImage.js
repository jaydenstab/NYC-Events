const categoryConfig = {
  music: { color: '#FF6B6B' },
  art: { color: '#4ECDC4' },
  other: { color: '#DDA0DD' },
};

const SHARE_CARD_WIDTH = 1200;
const SHARE_CARD_HEIGHT = 630;
const BRAND_COLOR = '#2563eb';
const BRAND_NAME = 'WhatsUpNYC';

function escapeXml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatRelativeDate(date) {
  if (!date || date === 'TBD') return 'Date TBD';
  const parsed = new Date(`${String(date).split('T')[0]}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Date TBD';

  const now = new Date();
  const toLocal = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const today = toLocal(now);
  const eventDay = toLocal(parsed);
  if (eventDay === today) return 'Tonight';

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (eventDay === toLocal(tomorrow)) return 'Tomorrow';

  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function buildShareCardSvg(event) {
  const category = (event.category || 'other').toLowerCase();
  const config = categoryConfig[category] || categoryConfig.other;
  const title = (event.name || 'NYC Event').length > 60
    ? `${String(event.name).slice(0, 57)}…`
    : event.name || 'NYC Event';
  const datePart = formatRelativeDate(event.date);
  const timePart = event.time && event.time !== 'TBD' ? ` · ${event.time}` : '';
  const locationLine = event.borough || event.address || 'NYC';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${SHARE_CARD_WIDTH}" height="${SHARE_CARD_HEIGHT}" viewBox="0 0 ${SHARE_CARD_WIDTH} ${SHARE_CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a8a"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="0" y="0" width="12" height="100%" fill="${config.color}"/>
  <text x="80" y="120" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="28" font-weight="600">${escapeXml(String(category).toUpperCase())}</text>
  <text x="80" y="220" fill="#ffffff" font-family="system-ui,sans-serif" font-size="56" font-weight="700">${escapeXml(title)}</text>
  <text x="80" y="300" fill="#cbd5e1" font-family="system-ui,sans-serif" font-size="32">${escapeXml(`${datePart}${timePart}`)}</text>
  <text x="80" y="360" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="28">${escapeXml(locationLine)}</text>
  <text x="80" y="560" fill="${BRAND_COLOR}" font-family="system-ui,sans-serif" font-size="36" font-weight="700">${BRAND_NAME}</text>
</svg>`;
}

module.exports = {
  buildShareCardSvg,
  SHARE_CARD_WIDTH,
  SHARE_CARD_HEIGHT,
};
