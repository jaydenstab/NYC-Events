const { CORE_SOURCES } = require('./scraperHealth');

function resolveActiveSources({ includeReddit = false } = {}) {
  const sources = [...CORE_SOURCES];

  if (process.env.SCRAPER_NYC_GO_ENABLED === 'true') {
    sources.push('nyc_go');
  }
  if (process.env.SCRAPER_NYC_PARKS_ENABLED === 'true') {
    sources.push('nyc_parks');
  }
  if (process.env.SCRAPER_UNION_SQUARE_ENABLED === 'true') {
    sources.push('union_square');
  }
  if (includeReddit) {
    sources.push('reddit');
  }

  return sources;
}

module.exports = { resolveActiveSources };
