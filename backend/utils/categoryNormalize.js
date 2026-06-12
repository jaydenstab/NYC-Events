const VALID_CATEGORIES = new Set([
  'Music',
  'Art',
  'Food & Drink',
  'Comedy',
  'Free',
  'Free Food',
  'Influencers',
  'Heritage',
  'Sports',
  'Education',
  'Health & Wellness',
  'Health',
  'Technology',
  'Business',
  'Theater',
  'Broadway',
  'Entertainment',
  'Performance',
  'Community',
  'Cultural',
  'Networking',
  'Workshop',
  'Tour',
  'Outdoor',
  'Family',
  'Nightlife',
  'Shopping',
  'Fashion',
  'Photography',
  'Gaming',
  'Other',
]);

const ALIASES = {
  food: 'Food & Drink',
  'food & drink': 'Food & Drink',
  fitness: 'Health & Wellness',
  wellness: 'Health & Wellness',
  tech: 'Technology',
  film: 'Entertainment',
  movies: 'Entertainment',
};

/**
 * Maps scraper / AI categories to the validator's canonical set.
 */
function normalizeCategory(raw) {
  if (raw === undefined || raw === null) return 'Other';
  const s = String(raw).trim();
  if (VALID_CATEGORIES.has(s)) return s;
  const lower = s.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  const titled =
    lower.length === 0
      ? 'Other'
      : lower.charAt(0).toUpperCase() + lower.slice(1);
  if (VALID_CATEGORIES.has(titled)) return titled;
  return 'Other';
}

/**
 * Returns a shallow copy safe for validateEvents (canonical category).
 */
function normalizeEventForValidation(event) {
  if (!event || typeof event !== 'object') return event;
  return {
    ...event,
    category: normalizeCategory(event.category),
  };
}

module.exports = {
  normalizeCategory,
  normalizeEventForValidation,
  VALID_CATEGORIES,
};
