const dbService = require('./dbService');
const { isPostgres } = require('./db');

const GENERIC_ADDRESS = 'New York, NY';

function shannonEntropy(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return Object.values(counts).reduce((entropy, c) => {
    if (c === 0) return entropy;
    const p = c / total;
    return entropy - p * Math.log2(p);
  }, 0);
}

function formatAge(ms) {
  if (ms == null) return null;
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function computeDataQuality() {
  await dbService.init();
  const allEvents = await dbService.getAllEvents();
  const eventCount = allEvents.length;

  const geocodeBreakdown = {};
  let geocodedOk = 0;
  let tbdDates = 0;
  let genericAddresses = 0;
  let missingWebsite = 0;
  const categoryDistribution = {};

  for (const e of allEvents) {
    const lq = e.locationQuality || 'unknown';
    geocodeBreakdown[lq] = (geocodeBreakdown[lq] || 0) + 1;
    if (
      e.latitude != null &&
      e.longitude != null &&
      lq !== 'default' &&
      lq !== 'pending'
    ) {
      geocodedOk += 1;
    }
    if (e.date === 'TBD') tbdDates += 1;
    if (
      e.address === GENERIC_ADDRESS ||
      (e.address && String(e.address).toLowerCase().includes('pending'))
    ) {
      genericAddresses += 1;
    }
    if (!e.website) missingWebsite += 1;
    const cat = (e.category || 'other').toLowerCase();
    categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
  }

  let embeddingCoverage = 0;
  if (eventCount > 0) {
    const vectorCount = await dbService.countEventVectors();
    embeddingCoverage = vectorCount / eventCount;
  }

  const lastIngestMetrics = await dbService.getLastIngestMetrics();
  const funnel = lastIngestMetrics?.funnel || {};
  const input = funnel.input || 0;
  const duplicateRateLastIngest =
    input > 0 ? (funnel.failed || 0) / input : 0;

  const sourceFreshness = {};
  const sourceCounts = lastIngestMetrics?.sourceCounts || {};
  const ingestAt = lastIngestMetrics?.at ? Date.parse(lastIngestMetrics.at) : null;
  const ageMs = ingestAt ? Date.now() - ingestAt : null;
  for (const source of Object.keys(sourceCounts)) {
    sourceFreshness[source] = formatAge(ageMs);
  }

  let perfectEvents = 0;
  for (const e of allEvents) {
    if (
      e.date !== 'TBD' &&
      e.address !== GENERIC_ADDRESS &&
      !(e.address && String(e.address).toLowerCase().includes('pending')) &&
      e.website
    ) {
      perfectEvents += 1;
    }
  }

  return {
    eventCount,
    geocodeSuccessRate: eventCount > 0 ? geocodedOk / eventCount : 0,
    geocodeBreakdown,
    duplicateRateLastIngest,
    sourceFreshness,
    embeddingCoverage: isPostgres() ? embeddingCoverage : null,
    categoryDistribution,
    categoryEntropy: parseFloat(shannonEntropy(categoryDistribution).toFixed(3)),
    dateCompleteness: eventCount > 0 ? 1 - tbdDates / eventCount : 0,
    addressCompleteness: eventCount > 0 ? 1 - genericAddresses / eventCount : 0,
    websiteCoverage: eventCount > 0 ? 1 - missingWebsite / eventCount : 0,
    perfectEventRate: eventCount > 0 ? perfectEvents / eventCount : 0,
    lastIngestAt: lastIngestMetrics?.at || null,
    driver: isPostgres() ? 'postgres' : 'sqlite',
  };
}

module.exports = { computeDataQuality };
