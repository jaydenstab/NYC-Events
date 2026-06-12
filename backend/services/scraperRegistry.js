const { normalizeEvent } = require('../utils/eventNormalize');
const { logger } = require('../logger');
const RedditAPIScraper = require('../reddit_api_scraper');
const UnionSquareScraper = require('../unionSquareScraper');
const OhMyRocknessScraper = require('../ohMyRocknessScraper');
const TheSkintScraper = require('../theSkintScraper');
const NYCParksScraper = require('../nycParksScraper');
const EventbriteScraper = require('../eventbriteScraper');
const NycGoScraper = require('../nycGoScraper');
const { parseParksDateTime, formatParksAddress } = require('../utils/nycParksNormalize');

const DEFAULT_ADDRESS = 'New York, NY';

function logSourceCompleteness(source, events) {
  if (!Array.isArray(events) || events.length === 0) {
    logger.info('source_completeness', {
      source,
      total: 0,
      complete: 0,
      rate: '0.00',
    });
    return;
  }

  const complete = events.filter(
    (e) =>
      e.date &&
      e.date !== 'TBD' &&
      e.address &&
      e.address !== DEFAULT_ADDRESS &&
      e.description &&
      !String(e.description).endsWith(' — NYC free event')
  );

  logger.info('source_completeness', {
    source,
    total: events.length,
    complete: complete.length,
    rate: (complete.length / events.length).toFixed(2),
  });
}

const unionSquareEnabled = () => process.env.SCRAPER_UNION_SQUARE_ENABLED === 'true';
const nycParksEnabled = () => process.env.SCRAPER_NYC_PARKS_ENABLED === 'true';
const nycGoEnabled = () => process.env.SCRAPER_NYC_GO_ENABLED === 'true';

async function fetchTheSkintEvents() {
  logger.info('service_fetch_the_skint_start');
  const skintScraper = new TheSkintScraper();
  const rawEvents = await skintScraper.scrapeEvents();
  return rawEvents.map((raw) =>
    normalizeEvent('the_skint', {
      name: raw.name,
      description: raw.description,
      address: raw.address,
      startTime: raw.startTime,
      date: raw.date,
      price: raw.price,
      category: raw.category || 'Community',
      website: raw.website,
    })
  );
}

async function fetchNycParksEvents() {
  logger.info('service_fetch_nyc_parks_start');
  const parksScraper = new NYCParksScraper();
  const rawEvents = await parksScraper.scrapeEvents();
  return rawEvents.map((raw) => {
    const { date, startTime } = parseParksDateTime(raw.date, raw.time);
    const address = formatParksAddress(raw.address);
    return normalizeEvent('nyc_parks', {
      name: raw.name,
      description: raw.description || `NYC Parks event: ${raw.name}`,
      address,
      startTime,
      date,
      price: 'Free',
      category: 'Outdoor',
      website: raw.website,
    });
  });
}

async function fetchNycGoEvents() {
  logger.info('service_fetch_nyc_go_start');
  const scraper = new NycGoScraper();
  const rawEvents = await scraper.scrapeEvents();
  return rawEvents.map((raw) => normalizeEvent('nyc_go', raw));
}

async function fetchRedditEvents() {
  logger.info('service_fetch_reddit_start');
  const redditScraper = new RedditAPIScraper();
  const redditEvents = await redditScraper.scrapeEvents();
  return redditEvents.map((event) =>
    normalizeEvent('reddit', {
      name: event.event_title || 'Untitled Event',
      description: `Event found on Reddit r/nyc - ${event.event_title}`,
      address: event.potential_location || 'New York, NY',
      startTime: event.potential_time || 'TBD',
      date: event.potential_date || 'TBD',
      price: 'Check Reddit post for details',
      category: 'Community',
      website: event.reddit_url,
      confidence: event.confidence || 5,
    })
  );
}

async function fetchEventbriteEvents() {
  logger.info('service_fetch_eventbrite_start');
  const scraper = new EventbriteScraper();
  const rawEvents = await scraper.scrapeEvents();
  const normalized = rawEvents.map((event) =>
    normalizeEvent('eventbrite', {
      name: event.name,
      description: event.description,
      address: event.address,
      startTime: event.startTime,
      date: event.date,
      price: event.price,
      category: event.category,
      website: event.website,
    })
  );
  logSourceCompleteness('eventbrite', normalized);
  return normalized;
}

async function fetchUnionSquareEvents() {
  logger.info('service_fetch_union_square_start');
  const unionSquareScraper = new UnionSquareScraper();
  const unionSquareEvents = await unionSquareScraper.scrapeEvents();
  return unionSquareEvents.map((event) =>
    normalizeEvent('union_square', {
      name: event.name,
      description: event.description,
      address: event.location,
      startTime: event.time,
      date: event.date,
      price: 'Check event details',
      category: 'Community',
      website: event.url,
    })
  );
}

async function fetchOhMyRocknessEvents() {
  logger.info('service_fetch_oh_my_rockness_start');
  const ohMyRocknessScraper = new OhMyRocknessScraper();
  const shows = await ohMyRocknessScraper.scrapeUpcomingShows();
  return shows.map((show) => {
    const isoDate = OhMyRocknessScraper.parseShowDate(show.date);
    const venue = show.venueAddress || show.venue || 'New York, NY';
    const address = venue.includes('New York') ? venue : `${venue}, New York, NY`;
    return normalizeEvent('oh_my_rockness', {
      name: show.name,
      description: show.description,
      address,
      startTime: show.time,
      date: isoDate,
      price: show.price,
      category: 'Music',
      website: show.url,
    });
  });
}

const FETCH_BY_NAME = {
  the_skint: fetchTheSkintEvents,
  oh_my_rockness: fetchOhMyRocknessEvents,
  eventbrite: fetchEventbriteEvents,
  nyc_go: fetchNycGoEvents,
  nyc_parks: fetchNycParksEvents,
  union_square: fetchUnionSquareEvents,
  reddit: fetchRedditEvents,
};

function getTargets({ includeReddit = false, onlyPrimary = false, excludePrimary = false } = {}) {
  const primary = [
    { name: 'the_skint', fetch: fetchTheSkintEvents },
    { name: 'oh_my_rockness', fetch: fetchOhMyRocknessEvents },
  ];

  const secondary = [{ name: 'eventbrite', fetch: fetchEventbriteEvents }];

  if (nycGoEnabled()) {
    secondary.push({ name: 'nyc_go', fetch: fetchNycGoEvents });
  }
  if (nycParksEnabled()) {
    secondary.push({ name: 'nyc_parks', fetch: fetchNycParksEvents });
  }
  if (unionSquareEnabled()) {
    secondary.push({ name: 'union_square', fetch: fetchUnionSquareEvents });
  }
  if (includeReddit) {
    secondary.push({ name: 'reddit', fetch: fetchRedditEvents });
  }

  if (onlyPrimary) return primary;
  if (excludePrimary) return secondary;
  return [...primary, ...secondary];
}

async function fetchSource(name) {
  const fn = FETCH_BY_NAME[name];
  if (!fn) throw new Error(`Unknown source: ${name}`);
  return fn();
}

module.exports = {
  getTargets,
  fetchSource,
  fetchTheSkintEvents,
  fetchNycParksEvents,
  fetchNycGoEvents,
  fetchRedditEvents,
  fetchEventbriteEvents,
  fetchUnionSquareEvents,
  fetchOhMyRocknessEvents,
};
