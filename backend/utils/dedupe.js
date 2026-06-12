// @ts-check
/** @typedef {import('../types/event').NormalizedEvent} NormalizedEvent */

const { compareTwoStrings } = require('string-similarity');
const { DEDUPE_SIMILARITY_THRESHOLD } = require('../configs/constants');

function isFuzzyDuplicate(event, candidateList) {
  return candidateList.some((existing) => {
    if (
      event.website &&
      existing.website &&
      event.website.toLowerCase().trim() === existing.website.toLowerCase().trim()
    ) {
      return true;
    }

    if (event.date !== 'TBD' && event.date === existing.date) {
      const nameSim = compareTwoStrings(
        event.name.toLowerCase(),
        existing.name.toLowerCase()
      );
      if (nameSim > DEDUPE_SIMILARITY_THRESHOLD) {
        const addrSim = compareTwoStrings(
          (event.address || '').toLowerCase(),
          (existing.address || '').toLowerCase()
        );
        if (addrSim > 0.5 || !event.address || !existing.address) return true;
      }
    }

    return false;
  });
}

function removeDuplicates(events) {
  const unique = [];
  const byDate = new Map();
  const byUrl = new Set();

  for (const event of events) {
    if (event.website) {
      const url = event.website.toLowerCase().trim();
      if (byUrl.has(url)) continue;
      byUrl.add(url);
    }

    const candidates =
      event.date && event.date !== 'TBD' ? byDate.get(event.date) || [] : unique;

    if (isFuzzyDuplicate(event, candidates)) continue;

    unique.push(event);
    if (event.date && event.date !== 'TBD') {
      if (!byDate.has(event.date)) byDate.set(event.date, []);
      byDate.get(event.date).push(event);
    }
  }

  return unique;
}

module.exports = { isFuzzyDuplicate, removeDuplicates };
