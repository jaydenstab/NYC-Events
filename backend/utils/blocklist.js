/**
 * Shared blocklist for filtering generic or low-quality content.
 * Centralizing this ensures consistency between scrapers, validators, and AI processors.
 */

const GENERIC_CONTENT_PATTERNS = [
  'things to do',
  'best things',
  'top things',
  'guide to',
  'complete guide',
  'ultimate guide',
  'everything you need',
  'must-see',
  'must-visit',
  'local guide',
  'tourist guide',
  'visitor guide',
  'nyc guide',
  '100 best',
  '80 best',
  '50 best',
  '25 best',
  '10 best',
  '5 best',
  'attractions that should be on your list',
  'locals and tourists',
  'experience the absolute best',
  'discover the new york attractions',
  'locals love including',
  'complete guide to',
  'ultimate guide to',
  'everything you need to know',
  'must-see attractions',
  'must-visit places',
  'best of nyc',
  'top attractions',
  'nyc attractions',
  'new york attractions',
  'hidden gems',
];

const GENERIC_EVENT_NAMES = [
  'unknown event',
  'event',
  'tbd',
  'to be announced',
  'coming soon',
  'event name',
  'title',
];

const NAV_JUNK_PATTERNS = [
  'newsletter',
  'featured shows',
  'just/announced',
  'most/popular',
  'subscribe',
  'sign up',
  'join our',
  'follow us',
  'navigation',
  'menu',
  'search',
  'footer',
  'header',
  'the latest',
  'popups',
  'event calendar',
  'latest',
  'log in',
  'account',
  'profile',
  'settings',
  'about us',
  'contact us',
  'privacy policy',
  'terms of service',
];

const NAV_JUNK_WHOLE_TITLE = new Set(['events', 'upcoming', 'event calendar']);

/**
 * Checks if text contains generic "guide-like" content
 */
function isGenericContent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return GENERIC_CONTENT_PATTERNS.some((p) => lower.includes(p));
}

/**
 * Checks if a name is just a placeholder
 */
function isGenericName(name) {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  return GENERIC_EVENT_NAMES.some((g) => lower === g);
}

/**
 * Extended junk filter for titles
 */
function isNavJunkTitle(title) {
  if (!title || typeof title !== 'string') return true;
  const t = title.trim();
  if (t.length < 4) return true;

  const lower = t.toLowerCase();

  if (NAV_JUNK_WHOLE_TITLE.has(lower)) return true;
  if (lower.startsWith('upcoming shows')) return true;

  if (NAV_JUNK_PATTERNS.some((p) => lower === p || lower.includes(p))) {
    return true;
  }

  if (t.length <= 10 && t === t.toUpperCase() && /[A-Z]/.test(t) && !t.includes(' ')) {
    return true;
  }

  return false;
}

const PLACEHOLDER_DATES = new Set(['date', 'unknown', '']);

function isPlaceholderDate(date) {
  if (date == null) return false;
  return PLACEHOLDER_DATES.has(String(date).trim().toLowerCase());
}

module.exports = {
  GENERIC_CONTENT_PATTERNS,
  GENERIC_EVENT_NAMES,
  isGenericContent,
  isGenericName,
  isNavJunkTitle,
  isPlaceholderDate,
};
