#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { computeDataQuality } = require('../services/dataQualityService');

const MIN_PERFECT_RATE = parseFloat(process.env.AUDIT_MIN_PERFECT_RATE || '0.5', 10);

async function audit() {
  console.log('--- Starting Data Quality Audit ---');
  const quality = await computeDataQuality();

  console.log('Total Events: ' + quality.eventCount);
  console.log(
    '- Perfect Event Rate: ' + (quality.perfectEventRate * 100).toFixed(1) + '%'
  );
  console.log('- Date Completeness: ' + (quality.dateCompleteness * 100).toFixed(1) + '%');
  console.log(
    '- Address Completeness: ' + (quality.addressCompleteness * 100).toFixed(1) + '%'
  );
  console.log('- Website Coverage: ' + (quality.websiteCoverage * 100).toFixed(1) + '%');
  console.log('- Geocode Success Rate: ' + (quality.geocodeSuccessRate * 100).toFixed(1) + '%');
  if (quality.embeddingCoverage != null) {
    console.log(
      '- Embedding Coverage: ' + (quality.embeddingCoverage * 100).toFixed(1) + '%'
    );
  }
  console.log('- Category Entropy: ' + quality.categoryEntropy);

  if (quality.eventCount > 0 && quality.perfectEventRate < MIN_PERFECT_RATE) {
    console.error(
      `audit-data-quality FAILED: perfectEventRate ${quality.perfectEventRate} < ${MIN_PERFECT_RATE}`
    );
    process.exit(1);
  }

  if (quality.eventCount === 0) {
    console.warn('audit-data-quality: no events in database (skipped threshold check)');
  } else {
    console.log('audit-data-quality: PASSED');
  }
}

audit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
