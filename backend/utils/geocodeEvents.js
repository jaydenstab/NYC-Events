const axios = require('axios');
const dbService = require('../services/dbService');
const { geocodeWithMapbox } = require('../services/geocodeProvider');
const { logger } = require('../logger');

const GEOCODE_DELAY_MS = parseInt(process.env.GEOCODE_DELAY_MS, 10) || 1000;

// Static cache for popular NYC venues to bypass OSM delay
const VENUE_CACHE = {
  'central park': { latitude: 40.7812, longitude: -73.9665 },
  'madison square garden': { latitude: 40.7505, longitude: -73.9934 },
  'union square park': { latitude: 40.7359, longitude: -73.9911 },
  'union square': { latitude: 40.7359, longitude: -73.9911 },
  'washington square park': { latitude: 40.7308, longitude: -73.9973 },
  'prospect park': { latitude: 40.6602, longitude: -73.9690 },
  'brooklyn museum': { latitude: 40.6712, longitude: -73.9637 },
  'metropolitan museum of art': { latitude: 40.7794, longitude: -73.9632 },
  'the met': { latitude: 40.7794, longitude: -73.9632 },
  'lincoln center': { latitude: 40.7725, longitude: -73.9835 },
  'barclays center': { latitude: 40.6826, longitude: -73.9754 },
  'bryant park': { latitude: 40.7536, longitude: -73.9832 },
  'high line': { latitude: 40.7480, longitude: -74.0048 },
  'chelsea market': { latitude: 40.7423, longitude: -74.0062 },
  'grand central terminal': { latitude: 40.7527, longitude: -73.9772 },
  'rockefeller center': { latitude: 40.7587, longitude: -73.9787 },
  'times square': { latitude: 40.7580, longitude: -73.9855 },
  'battery park': { latitude: 40.7033, longitude: -74.0170 },
  'moma': { latitude: 40.7614, longitude: -73.9776 },
  'whitney museum': { latitude: 40.7396, longitude: -74.0089 },
  "baby's all right": { latitude: 40.7103, longitude: -73.9615 },
  'babys all right': { latitude: 40.7103, longitude: -73.9615 },
  elsewhere: { latitude: 40.7054, longitude: -73.9232 },
  'mercury lounge': { latitude: 40.722, longitude: -73.9867 },
  'le poisson rouge': { latitude: 40.7284, longitude: -73.9997 },
  'bowery ballroom': { latitude: 40.7204, longitude: -73.9939 },
  'brooklyn steel': { latitude: 40.7192, longitude: -73.925 },
  'rough trade': { latitude: 40.7101, longitude: -73.9616 },
  'tv eye': { latitude: 40.7142, longitude: -73.9444 },
  'the sultan room': { latitude: 40.7048, longitude: -73.927 },
  'the bell house': { latitude: 40.6737, longitude: -73.9912 },
  'pioneer works': { latitude: 40.6756, longitude: -74.0161 },
  'knockdown center': { latitude: 40.706, longitude: -73.9235 },
  nowadays: { latitude: 40.6964, longitude: -73.9028 },
  nublu: { latitude: 40.7265, longitude: -73.9815 },
  'national sawdust': { latitude: 40.7197, longitude: -73.9575 },
  'saint vitus': { latitude: 40.7184, longitude: -73.9571 },
  'the meadows': { latitude: 40.7505, longitude: -73.8448 },
  'bushwick inlet park': { latitude: 40.7225, longitude: -73.9612 },
  'museum of the city of new york': { latitude: 40.7925, longitude: -73.9519 },
  "joe's pub": { latitude: 40.7295, longitude: -73.9916 },
  'joes pub': { latitude: 40.7295, longitude: -73.9916 },
};

function venueNameFromAddress(address) {
  const part = String(address || '')
    .split(',')[0]
    ?.trim()
    .toLowerCase();
  return part || '';
}

function lookupVenueCache(cleanAddr) {
  for (const [venue, coords] of Object.entries(VENUE_CACHE)) {
    if (cleanAddr.includes(venue)) {
      return { coords, quality: 'venue_cache' };
    }
  }
  return null;
}

function normalizeAddressKey(address) {
  return String(address || '').toLowerCase().trim();
}

async function resolveCoordinates(address, batchCache) {
  const generic =
    !address ||
    address.toLowerCase() === 'new york, ny' ||
    address.toLowerCase() === 'nyc';

  if (generic) {
    const venueKey = venueNameFromAddress(address);
    if (venueKey) {
      const cached = lookupVenueCache(venueKey);
      if (cached) {
        logger.debug('geocode_resolve', { source: 'venue_cache', address: venueKey });
        return cached;
      }
    }
    return { coords: null, quality: 'default' };
  }

  const cleanAddr = address.toLowerCase().trim().replace(/, new york, ny$/i, '').replace(/, ny$/i, '');

  // 1. Check Static Venue Cache (full address + venue-only prefix)
  const venueCached = lookupVenueCache(cleanAddr);
  if (venueCached) {
    logger.debug('geocode_resolve', { source: 'venue_cache', address: cleanAddr });
    return venueCached;
  }

  const venueOnly = venueNameFromAddress(address);
  if (venueOnly && venueOnly !== cleanAddr) {
    const prefixCached = lookupVenueCache(venueOnly);
    if (prefixCached) {
      logger.debug('geocode_resolve', { source: 'venue_cache', address: venueOnly });
      return prefixCached;
    }
  }

  // 2. Check Batch Cache
  if (batchCache && batchCache.has(cleanAddr)) {
    logger.debug('geocode_resolve', { source: 'batch', address: cleanAddr });
    return { coords: batchCache.get(cleanAddr), quality: 'batch' };
  }

  // 3. Check Database Cache
  const cached = await dbService.getCachedLocation(cleanAddr);
  if (cached) {
    logger.debug('geocode_resolve', { source: 'db', address: cleanAddr });
    if (batchCache) batchCache.set(cleanAddr, cached);
    return { coords: cached, quality: 'db_cache' };
  }

  // 4. Mapbox Geocoding API
  const mapbox = await geocodeWithMapbox(address);
  if (mapbox) {
    const result = { latitude: mapbox.latitude, longitude: mapbox.longitude };
    await dbService.saveCachedLocation(cleanAddr, {
      ...result,
      locationQuality: mapbox.locationQuality,
    });
    if (batchCache) batchCache.set(cleanAddr, result);
    logger.debug('geocode_resolve', { source: 'mapbox', address: cleanAddr });
    return { coords: result, quality: 'mapbox' };
  }

  // 5. OSM Nominatim fallback
  try {
    await new Promise((r) => setTimeout(r, GEOCODE_DELAY_MS));
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', New York, NY')}&limit=1`;
    const response = await axios.get(url, { headers: { 'User-Agent': 'WhatsUpNYC-App' } });
    
    if (response.data && response.data.length > 0) {
      const result = {
        latitude: parseFloat(response.data[0].lat),
        longitude: parseFloat(response.data[0].lon)
      };
      await dbService.saveCachedLocation(cleanAddr, { ...result, locationQuality: 'osm' });
      if (batchCache) batchCache.set(cleanAddr, result);
      logger.debug('geocode_resolve', { source: 'osm', address: cleanAddr });
      return { coords: result, quality: 'osm' };
    }
  } catch (err) {
    logger.warn('geocode_osm_failed', { address, message: err.message });
  }

  const lastChance = lookupVenueCache(venueNameFromAddress(address));
  if (lastChance) {
    logger.debug('geocode_resolve', { source: 'venue_cache', address: venueNameFromAddress(address) });
    return lastChance;
  }

  return { coords: null, quality: 'default' };
}

async function geocodeEventsBatch(events) {
  const batchCache = new Map();
  const results = [];
  const maxToGeocode = parseInt(process.env.GEOCODE_AGGREGATE_MAX, 10) || 75;

  logger.info('geocode_batch_start', { count: events.length, max: maxToGeocode });

  for (let i = 0; i < Math.min(events.length, maxToGeocode); i++) {
    const event = events[i];
    const { coords, quality } = await resolveCoordinates(event.address, batchCache);
    if (coords) {
      results.push({ ...event, latitude: coords.latitude, longitude: coords.longitude, locationQuality: quality });
    } else {
      results.push(event);
    }
  }

  // Add remaining events without geocoding
  if (events.length > maxToGeocode) {
      results.push(...events.slice(maxToGeocode));
  }

  const stats = {
      geocoded: results.filter(e => e.latitude !== null).length,
      osmCalls: results.filter(e => e.locationQuality === 'osm').length,
      dbHits: results.filter(e => e.locationQuality === 'db_cache').length,
      venueHits: results.filter(e => e.locationQuality === 'venue_cache').length
  };
  logger.info('geocode_batch_done', stats);

  return results;
}

module.exports = { resolveCoordinates, geocodeEventsBatch, normalizeAddressKey };
