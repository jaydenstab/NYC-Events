// @ts-check
/** @typedef {import('../types/event').RawScrapedEvent} RawScrapedEvent */
/** @typedef {import('../types/event').NormalizedEvent} NormalizedEvent */

const crypto = require("crypto");
const sanitizeHtml = require("sanitize-html");
const { normalizeCategory } = require("./categoryNormalize");
const { splitAddress } = require("./addressSplitter");

const NYC_DEFAULT = { latitude: 40.7282, longitude: -73.9857 };

function clean(text) {
  if (!text) return "";
  return sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

function seededJitter(coord, seedHex, axis = 0) {
  const slice = seedHex.slice(axis * 4, axis * 4 + 8).padEnd(8, "0");
  const n = parseInt(slice, 16) / 0xffffffff;
  const jitter = (n - 0.5) * 0.005;
  return parseFloat((coord + jitter).toFixed(6));
}

function buildEventId(source, fields = {}) {
  let key;
  if (fields.website && fields.website.length > 10) {
    key = fields.website.split("?")[0].toLowerCase().trim();
  } else {
    const name = String(fields.name || "").toLowerCase().trim();
    const date = String(fields.date || "").trim();
    const address = String(fields.address || "").toLowerCase().trim();
    key = source + "|" + name + "|" + date + "|" + address;
  }

  const hash = crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
  return source + "_" + hash;
}

function normalizeEvent(source, raw = {}) {
  const name = clean(raw.name) || "Untitled Event";
  const [inferredVenue, cleanAddress] = splitAddress(raw.address);
  const address = clean(cleanAddress || raw.address) || "New York, NY";
  const description = clean(raw.description) || "No description available";
  const date = raw.date || "TBD";
  const website = raw.website ?? null;
  
  const category = normalizeCategory(raw.category || "Other");

  let latitude = raw.latitude ?? null;
  let longitude = raw.longitude ?? null;
  let locationQuality = raw.locationQuality || null;

  const id = buildEventId(source, { name, date, address, website });

  const event = {
    id,
    source,
    name,
    description,
    address,
    startTime: raw.startTime || "TBD",
    date,
    price: raw.price ?? "Unknown",
    category,
    latitude,
    longitude,
    website,
    locationQuality,
    createdAt: raw.createdAt || new Date().toISOString(),
  };

  if (raw.confidence != null) event.confidence = raw.confidence;
  if (raw.scrapedAt) event.scrapedAt = raw.scrapedAt;
  if (raw.score != null) event.score = raw.score;

  return event;
}

function attachCoordinates(event, coords, quality) {
  if (!event || !coords) return event;
  return {
    ...event,
    latitude: coords.latitude,
    longitude: coords.longitude,
    locationQuality: quality,
  };
}

function needsGeocoding(event) {
  return (
    event.latitude == null ||
    event.longitude == null ||
    event.locationQuality === "pending" ||
    event.locationQuality === "default" ||
    event.locationQuality == null
  );
}

function applyJitteredDefaults(event) {
  if (!event) return event;
  if (event.latitude != null && event.longitude != null) return event;
  const idSeed = event.id && event.id.includes("_") ? event.id.split("_").pop() : event.id || "";
  return {
    ...event,
    latitude: seededJitter(NYC_DEFAULT.latitude, idSeed, 0),
    longitude: seededJitter(NYC_DEFAULT.longitude, idSeed, 1),
    locationQuality: "default",
  };
}

function keywordFilter(events, searchQuery) {
  if (!searchQuery || !searchQuery.trim()) return events;
  const term = searchQuery.toLowerCase().trim();
  return events.filter((event) => {
    const haystack = [
      event.name,
      event.description,
      event.category,
      event.address,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

module.exports = {
  buildEventId,
  normalizeEvent,
  attachCoordinates,
  needsGeocoding,
  applyJitteredDefaults,
  keywordFilter,
  NYC_DEFAULT,
};
