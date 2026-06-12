const { logger } = require('../logger');

const DEFAULT_ADDRESS = 'New York, NY';

function isEventType(type) {
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => String(t).toLowerCase().includes('event'));
}

function isItemListType(type) {
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => String(t).toLowerCase().includes('itemlist'));
}

function formatStartTime(startDate) {
  if (!startDate || Number.isNaN(startDate.getTime())) return 'TBD';
  return startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatPrice(offers, isFree) {
  if (isFree === true) return 'Free';
  if (!offers) return 'Unknown';

  const offerList = Array.isArray(offers) ? offers : [offers];
  for (const offer of offerList) {
    if (!offer) continue;
    if (offer.price === 0 || offer.price === '0' || offer.price === '0.0' || offer.price === 0.0) {
      return 'Free';
    }
    if (offer.price != null && offer.price !== '') return String(offer.price);
    if (offer.lowPrice != null) return String(offer.lowPrice);
  }
  return 'Unknown';
}

function formatAddress(location) {
  if (!location) return DEFAULT_ADDRESS;

  if (typeof location === 'string') {
    return location.trim() || DEFAULT_ADDRESS;
  }

  const locName = location.name || '';
  const addr = location.address;

  if (typeof addr === 'string') {
    const trimmed = addr.trim();
    if (locName && trimmed) {
      if (trimmed.toLowerCase().includes(locName.toLowerCase())) return trimmed;
      return `${locName}, ${trimmed}`;
    }
    return trimmed || locName || DEFAULT_ADDRESS;
  }

  if (addr && typeof addr === 'object') {
    const street = addr.streetAddress || '';
    const locality = addr.addressLocality || '';
    const region = addr.addressRegion || '';
    const postal = addr.postalCode || '';
    const parts = [];
    if (locName && !street.toLowerCase().includes(locName.toLowerCase())) {
      parts.push(locName);
    } else if (locName && !street) {
      parts.push(locName);
    }
    if (street) parts.push(street);
    const cityLine = [locality, region, postal].filter(Boolean).join(' ');
    if (cityLine && !street.includes(locality)) parts.push(cityLine);
    else if (cityLine && !parts.length) parts.push(cityLine);
    if (parts.length > 0) return parts.join(', ');
  }

  return locName || DEFAULT_ADDRESS;
}

function itemToEvent(item, sourceName) {
  if (!item || !isEventType(item['@type'])) return null;

  const startDate = item.startDate ? new Date(item.startDate) : null;
  const validDate = startDate && !Number.isNaN(startDate.getTime());

  const event = {
    name: item.name,
    description: item.description || '',
    date: validDate ? startDate.toISOString().split('T')[0] : 'TBD',
    startTime: validDate ? formatStartTime(startDate) : 'TBD',
    address: formatAddress(item.location),
    website: item.url || '',
    price: formatPrice(item.offers, item.isAccessibleForFree || item.isFree),
    source: sourceName,
    scrapedAt: new Date().toISOString(),
  };

  if (!event.name) return null;
  return event;
}

/**
 * Recursively collect schema.org Event nodes from JSON-LD payloads.
 * Handles @graph, ItemList, and nested arrays.
 */
function collectEventItems(data, out = []) {
  if (data == null) return out;

  if (Array.isArray(data)) {
    data.forEach((entry) => collectEventItems(entry, out));
    return out;
  }

  if (typeof data !== 'object') return out;

  if (isEventType(data['@type'])) {
    out.push(data);
    return out;
  }

  if (data['@graph']) {
    collectEventItems(data['@graph'], out);
  }

  if (isItemListType(data['@type']) && data.itemListElement) {
    const elements = Array.isArray(data.itemListElement)
      ? data.itemListElement
      : [data.itemListElement];
    elements.forEach((el) => {
      if (el?.item) collectEventItems(el.item, out);
      else collectEventItems(el, out);
    });
  }

  // Some pages nest events under mainEntity
  if (data.mainEntity) {
    collectEventItems(data.mainEntity, out);
  }

  return out;
}

function parseJsonLd($, sourceName) {
  const events = [];
  const seen = new Set();
  const scripts = $('script[type="application/ld+json"]');

  scripts.each((_, script) => {
    try {
      const raw = $(script).html();
      if (!raw) return;

      const data = JSON.parse(raw);
      const items = collectEventItems(data);

      items.forEach((item) => {
        const event = itemToEvent(item, sourceName);
        if (!event) return;

        const key = `${event.name}|${event.date}|${event.website}`;
        if (seen.has(key)) return;
        seen.add(key);
        events.push(event);
      });
    } catch (err) {
      logger.warn('json_ld_parse_error', { source: sourceName, message: err.message });
    }
  });

  return events;
}

module.exports = {
  parseJsonLd,
  collectEventItems,
  itemToEvent,
  formatAddress,
  formatPrice,
};
