#!/usr/bin/env node
/**
 * Print top hybrid search results per golden query to help label relevantEventIds.
 * Usage: node scripts/label-search-golden.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const dbService = require('../services/dbService');
const vectorService = require('../services/vectorService');

const goldenPath = path.join(__dirname, '../benchmarks/fixtures/search-golden.json');

async function main() {
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  await dbService.init();
  const indexReady = await vectorService.isIndexReady();
  if (!indexReady) {
    console.error('Vector index not ready — run ingest first.');
    process.exit(1);
  }

  for (const item of golden) {
    if (item.skip) continue;
    console.log(`\nQuery: "${item.query}"`);
    const results = await vectorService.hybridSearch(item.query, 10);
    results.forEach((e, i) => {
      console.log(`  ${i + 1}. [${e.id}] ${e.name} (${e.source || 'unknown'})`);
    });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
