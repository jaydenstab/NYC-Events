/**
 * Maps a SQLite events row (or JOIN row) to the canonical API event shape.
 */
function rowToEvent(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.id,
    source: row.source,
    name: row.name,
    description: row.description,
    address: row.address,
    startTime: row.startTime,
    date: row.date,
    price: row.price,
    category: row.category,
    latitude: row.latitude,
    longitude: row.longitude,
    website: row.website,
    locationQuality: row.locationQuality || 'pending',
    scrapedAt: row.scrapedAt || undefined,
    createdAt: row.createdAt,
  };
}

module.exports = { rowToEvent };
