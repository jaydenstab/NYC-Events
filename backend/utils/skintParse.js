const chrono = require('chrono-node');
const { todayNYC } = require('./dateUtils');

const BULLET_PREFIX = /^►\s*/;
const SPONSORED_RE = /^sponsored/i;
const SECTION_DAY_RE = /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)(,?\s+\w+\s+\d+)?/i;
const SECTION_MONTH_RE = /^(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i;

/**
 * Parse Skint homepage text into structured events.
 * Handles ► bullet lines and section headers.
 */
function parseLines(text, referenceDate = new Date()) {
  if (!text || typeof text !== 'string') return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let sectionContext = '';
  const events = [];

  for (const line of lines) {
    if (SPONSORED_RE.test(line)) continue;

    if (!BULLET_PREFIX.test(line)) {
      if (isSectionHeader(line)) {
        sectionContext = line;
      }
      continue;
    }

    const parsed = parseBulletLine(line, sectionContext, referenceDate);
    if (parsed) events.push(parsed);
  }

  return events;
}

function isSectionHeader(line) {
  const lower = line.toLowerCase();
  if (SECTION_DAY_RE.test(lower)) return true;
  if (SECTION_MONTH_RE.test(lower)) return true;
  if (/^thru\s+/i.test(lower)) return true;
  if (/^(mon|tue|wed|thu|fri|sat|sun)\s+\d/i.test(lower)) return true;
  
  // Chrono fallback for dynamic headers
  if (line.length > 3 && line.length < 60) {
    const parsed = chrono.parse(line);
    if (parsed.length > 0) {
      return parsed[0].start.isCertain('month') || parsed[0].start.isCertain('day') || parsed[0].start.isCertain('weekday');
    }
  }
  
  return false;
}

function parseBulletLine(line, sectionContext, referenceDate) {
  const body = line.replace(BULLET_PREFIX, '').trim();
  if (body.length < 10) return null;

  const { name, venue, neighborhood, description } = parseTitleVenue(body);
  if (!name || name.length < 3) return null;

  const address = buildAddress(venue, neighborhood);
  const website = extractUrl(body, { name, venue, address });
  const price = extractPrice(body);
  const { date, startTime } = parseDateTime(sectionContext, body, referenceDate);
  const category = inferCategory(body, sectionContext);

  return {
    name,
    description: description || body,
    date,
    startTime,
    address,
    price,
    website: website || null,
    category,
  };
}

function parseTitleVenue(body) {
  let text = body.replace(/\[\s*>>\s*\]\([^)]+\)/gi, '').trim();
  text = text.replace(/\[\s*>>\s*\]/gi, '').trim();

  // Strip leading time prefixes
  text = text.replace(/^(?:(?:mon|tue|wed|thu|fri|sat|sun)\s+)?(?:\d{1,2}(?::\d{2})?\s*(?:am|pm)(?:\s*-\s*(?:\d{1,2}(?::\d{2})?\s*)?(?:am|pm|midnight))?|\d{1,2}-\d{1,2}\s*(?:am|pm))\s*:\s*/i, '').trim();

  // Neighborhood extraction
  let neighborhood = '';
  const geoMatch = text.match(/\(([^)]+)\)\s*\.?\s*$/) || text.match(/-\s*([^,-]+)$/);
  if (geoMatch) {
    neighborhood = geoMatch[1].trim();
    text = text.replace(geoMatch[0], '').trim();
  }

  // Split name/venue by FIRST colon
  const colonIdx = text.indexOf(':');
  let name = text;
  let venue = '';
  
  if (colonIdx > 0 && colonIdx < 100) {
    name = text.substring(0, colonIdx).trim();
    venue = text.substring(colonIdx + 1).trim();
  }

  name = name.replace(/\.\s*$/, '').trim();
  if (name.length > 150) name = name.substring(0, 147) + '...';

  return { 
    name, 
    venue, 
    neighborhood, 
    description: venue ? `${name} at ${venue} (${neighborhood})` : `${name} (${neighborhood})` 
  };
}

function buildAddress(venue, neighborhood) {
  const parts = [venue, neighborhood, 'New York, NY'].filter(p => p && p.length > 2 && p.toLowerCase() !== 'nyc');
  return parts.join(', ');
}

function extractUrl(text, context = {}) {
  const match = text.match(/\[\s*>>\s*\]\(([^)]+)\)/i);
  if (match) return match[1].replace(/&#038;/g, '&').trim();
  const markdownLink = text.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/i);
  if (markdownLink) return markdownLink[2].replace(/&#038;/g, '&').trim();
  const plainMatch = text.match(/https?:\/\/[^\s)]+/i);
  if (plainMatch) return plainMatch[0].replace(/&#038;/g, '&').trim();

  const { name, venue, address } = context;
  if (name || venue) {
    const q = [name, venue, address, 'NYC'].filter(Boolean).join(' ');
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  }
  return null;
}

function extractPrice(text) {
  const lower = text.toLowerCase();
  if (/\bfree\b/.test(lower) && !/\$\d/.test(lower)) return 'Free';
  const match = text.match(/\$\d+(?:\.\d{2})?/);
  return match ? match[0] : 'Check details';
}

function parseDateTime(sectionContext, body, referenceDate) {
  const combined = [sectionContext, body].filter(Boolean).join(' ');
  const ref = chrono.parse(combined, referenceDate, { forwardDate: true });

  if (ref.length > 0) {
    const start = ref[0].start.date();
    const date = start.toISOString().split('T')[0];
    const hasTime = ref[0].start.isCertain('hour') || /\d{1,2}(?::\d{2})?\s*(?:am|pm)/i.test(body);
    const startTime = hasTime ? start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'TBD';
    return { date, startTime };
  }
  return { date: 'TBD', startTime: 'TBD' };
}

function inferCategory(body, sectionContext) {
  const text = `${sectionContext} ${body}`.toLowerCase();
  if (/comedy|stand-up/.test(text)) return 'Comedy';
  if (/music|concert|dj|party|nightlife/.test(text)) return 'Nightlife';
  if (/food|market|bazaar|fair|bbq/.test(text)) return 'Food & Drink';
  if (/art|gallery|exhibition|museum/.test(text)) return 'Art';
  if (/theater|play|broadway/.test(text)) return 'Theater';
  if (/film|movie|screening/.test(text)) return 'Film';
  return 'Community';
}

function toIsoDateOnly(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

function filterFutureEvents(events, referenceDate) {
  const todayStr = referenceDate ? toIsoDateOnly(referenceDate) : todayNYC();
  if (!todayStr) return events;

  return events.filter((event) => {
    if (!event.date || event.date === 'TBD') return true;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(event.date)) return true;
    return event.date >= todayStr;
  });
}

module.exports = {
  parseLines,
  filterFutureEvents,
  isSectionHeader,
  parseBulletLine,
};
