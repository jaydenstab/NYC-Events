const axios = require('axios');
const { logger } = require('../logger');

const MAPBOX_TOKEN =
  process.env.MAPBOX_ACCESS_TOKEN ||
  process.env.MAPBOX_SECRET_TOKEN ||
  process.env.VITE_MAPBOX_ACCESS_TOKEN;

async function geocodeWithMapbox(address) {
  if (!MAPBOX_TOKEN || !address) return null;

  const q = encodeURIComponent(
    address.includes('New York') ? address : `${address}, New York, NY`
  );
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${q}.json?access_token=${MAPBOX_TOKEN}&limit=1&country=US&proximity=-73.9857,40.7282`;

  try {
    const { data } = await axios.get(url, { timeout: 10_000 });
    const feature = data.features?.[0];
    if (!feature?.center) return null;
    return {
      latitude: feature.center[1],
      longitude: feature.center[0],
      locationQuality: 'mapbox',
    };
  } catch (err) {
    logger.warn('mapbox_geocode_failed', { address, message: err.message });
    return null;
  }
}

module.exports = { geocodeWithMapbox };
