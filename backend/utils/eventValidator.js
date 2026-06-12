// @ts-check
/**
 * Event validation utilities
 */
/** @typedef {import('../types/event').NormalizedEvent} NormalizedEvent */

const { logger } = require("../logger");
const { todayNYC } = require("./dateUtils");
const { isNavJunkTitle, isPlaceholderDate, isGenericName, isGenericContent } = require("./blocklist");
const { isFuzzyDuplicate, removeDuplicates } = require("./dedupe");

function isValidEvent(event) {
  if (!event) return false;
  
  const requiredFields = ["name", "address"];
  for (const field of requiredFields) {
    if (!event[field] || event[field].trim() === "") {
      logger.warn("scraper_rejected", { name: event.name || "Unnamed", reason: "Missing field: " + field });
      return false;
    }
  }

  // --- Date Validation: Allow today ---
  if (event.date && event.date !== "TBD") {
    // Compare YYYY-MM-DD strings to avoid timezone issues
    const today = todayNYC();
    if (event.date < today) {
      logger.warn("scraper_rejected", { name: event.name, reason: "Past date", date: event.date, today });
      return false;
    }
  }
  
  if (event.name.length < 5 || event.name.length > 200) {
      logger.warn("scraper_rejected", { name: event.name, reason: "Invalid name length" });
      return false;
  }
  if (isGenericName(event.name)) {
      logger.warn("scraper_rejected", { name: event.name, reason: "Generic name" });
      return false;
  }
  if (isNavJunkTitle(event.name)) {
      logger.warn("scraper_rejected", { name: event.name, reason: "Junk title" });
      return false;
  }
  if (isPlaceholderDate(event.date)) {
      logger.warn("scraper_rejected", { name: event.name, reason: "Placeholder date" });
      return false;
  }
  if (isGenericContent(event.name)) {
      logger.warn("scraper_rejected", { name: event.name, reason: "Generic content" });
      return false;
  }
  
  const junkAddresses = new Set(["nyc", "new york", "tbd"]);
  if (junkAddresses.has(event.address.toLowerCase().trim())) {
      if (!["reddit", "real-time-scraping"].includes(event.source)) {
          logger.warn("scraper_rejected", { name: event.name, reason: "Junk address", address: event.address });
          return false;
      }
  }

  return true;
}

function validateEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.filter(isValidEvent);
}

function removeDuplicatesWithLogging(events) {
  const unique = [];
  for (const event of events) {
    if (!isFuzzyDuplicate(event, unique)) {
      unique.push(event);
    } else {
      logger.info('scraper_duplicate_dropped', { name: event.name });
    }
  }
  return unique;
}

module.exports = {
  isValidEvent,
  validateEvents,
  removeDuplicates: removeDuplicatesWithLogging,
};
