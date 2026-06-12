const dbService = require('../services/dbService');
const cache = require('../cache');
const { resolveCoordinates } = require('./geocodeEvents');
const { needsGeocoding } = require('./eventNormalize');
const { logger } = require('../logger');

async function geocodeEventIds(eventIds) {
  if (!eventIds?.length) return;
  const events = await dbService.getEventsByIds(eventIds);
  const batchCache = new Map();
  let updated = 0;

  for (const event of events) {
    if (!needsGeocoding(event) && event.locationQuality !== 'pending') continue;
    const { coords, quality } = await resolveCoordinates(event.address, batchCache);
    if (coords) {
      await dbService.updateEventCoordinates(
        event.id,
        coords.latitude,
        coords.longitude,
        quality
      );
      updated += 1;
    }
  }

  if (updated > 0) {
    await cache.bumpGeneration();
    await cache.publish('ingest:status', { geocoded: updated });
  }
  logger.info('geocode_batch_worker_done', { requested: eventIds.length, updated });
}

module.exports = { geocodeEventIds };
