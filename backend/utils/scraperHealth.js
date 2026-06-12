const CORE_SOURCES = ['the_skint', 'oh_my_rockness', 'eventbrite'];
const { SCRAPER_HEALTH_STREAK_THRESHOLD } = require('../configs/constants');

function getHistoryLimit() {
  return parseInt(process.env.SCRAPER_HISTORY_LIMIT, 10) || 5;
}

function getZeroStreakThreshold() {
  return SCRAPER_HEALTH_STREAK_THRESHOLD;
}

/**
 * Trailing count of consecutive zero yields (most recent at end).
 */
function computeZeroStreak(lastCounts) {
  if (!lastCounts || lastCounts.length === 0) return 0;
  let streak = 0;
  for (let i = lastCounts.length - 1; i >= 0; i--) {
    if (lastCounts[i] === 0) streak += 1;
    else break;
  }
  return streak;
}

/**
 * Append one ingest result for a source; cap lastCounts.
 */
function updateSourceHistory(entry, { count, at, failed, error, historyLimit = getHistoryLimit() }) {
  const prev = entry?.lastCounts || [];
  const lastCounts = [...prev, count].slice(-historyLimit);
  const lastOutcome = failed ? 'scrape_failed' : count === 0 ? 'empty' : 'ok';

  return {
    lastCounts,
    lastAt: at,
    lastError: error || null,
    lastOutcome,
  };
}

/**
 * Evaluate degraded sources from persisted history for sources that ran this ingest.
 */
function evaluateScraperHealth(history, { participatedSources, threshold = getZeroStreakThreshold() }) {
  const degradedSources = [];
  const sourceStatus = {};

  for (const source of participatedSources) {
    const entry = history[source];
    if (!entry) continue;

    const streak = computeZeroStreak(entry.lastCounts);
    const lastCount = entry.lastCounts[entry.lastCounts.length - 1] ?? 0;

    sourceStatus[source] = {
      streak,
      lastCount,
      lastOutcome: entry.lastOutcome,
      lastAt: entry.lastAt,
    };

    if (streak >= threshold) {
      degradedSources.push(source);
    }
  }

  return { degradedSources, sourceStatus };
}

/**
 * Apply one ingest's per-source results to history and return health snapshot.
 * @param {Object} history - map source -> entry
 * @param {Array<{ name: string, count: number, failed?: boolean, error?: string }>} sourceResults
 */
function applyIngestToHistory(history, sourceResults, options = {}) {
  const at = options.at || new Date().toISOString();
  const historyLimit = options.historyLimit ?? getHistoryLimit();
  const threshold = options.threshold ?? getZeroStreakThreshold();

  const next = { ...(history || {}) };
  const participatedSources = [];

  for (const result of sourceResults) {
    const { name, count, failed = false, error } = result;
    participatedSources.push(name);
    next[name] = updateSourceHistory(next[name], {
      count: failed ? 0 : count,
      at,
      failed,
      error,
      historyLimit,
    });
  }

  const scraperHealth = evaluateScraperHealth(next, { participatedSources, threshold });
  return { history: next, scraperHealth, participatedSources };
}

/**
 * Structural validation for Skint homepage scrape signals.
 */
function checkSkintStructure({ bulletCount, parsedLength, rawTextLength }) {
  const bullets = bulletCount ?? 0;
  const parsed = parsedLength ?? 0;
  const rawLen = rawTextLength ?? 0;

  if (bullets < 3) {
    return { ok: false, reason: 'low_bullet_count', bulletCount: bullets };
  }
  if (parsed === 0 && rawLen > 500) {
    return {
      ok: false,
      reason: 'parse_empty_large_page',
      parsedLength: parsed,
      rawTextLength: rawLen,
    };
  }
  return { ok: true };
}

/**
 * Structural validation when OMR returns no shows after a nominally successful run.
 */
function checkOmrStructure({ count, listUrlsFound }) {
  if (count === 0) {
    return {
      ok: false,
      reason: 'zero_shows_after_parse',
      listUrlsFound: listUrlsFound ?? null,
    };
  }
  return { ok: true };
}

/**
 * Semantic validation of parsed event content.
 * Ensures essential fields are present and dates are valid.
 */
function validateEventContent(events) {
  const issues = [];
  if (!Array.isArray(events) || events.length === 0) {
    return { valid: true, issues }; // Or false if empty is invalid
  }

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (!event.name || event.name.trim().length < 3) {
      issues.push({ index: i, error: 'missing_or_short_name', event });
    }
    if (!event.date || isNaN(new Date(event.date).getTime())) {
      issues.push({ index: i, error: 'invalid_date', event });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    errorRate: issues.length / events.length,
  };
}


module.exports = {
  CORE_SOURCES,
  getHistoryLimit,
  getZeroStreakThreshold,
  computeZeroStreak,
  updateSourceHistory,
  evaluateScraperHealth,
  applyIngestToHistory,
  checkSkintStructure,
  checkOmrStructure,
  validateEventContent,
};
