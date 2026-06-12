#!/usr/bin/env node
/**
 * Search quality benchmark: keyword, semantic, hybrid (RRF).
 * Requires DATABASE_URL and indexed vectors for semantic/hybrid.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const dbService = require('../services/dbService');
const vectorService = require('../services/vectorService');
const { keywordFilter } = require('../utils/eventNormalize');
const { summarizeSearchBenchmark } = require('./lib/metrics');

const goldenPath = path.join(__dirname, 'fixtures/search-golden.json');

async function rankKeyword(allEvents, query) {
  return keywordFilter(allEvents, query).map((e) => e.id);
}

async function rankSemantic(query, limit = 50) {
  const results = await vectorService.search(query, limit);
  return results.map((e) => e.id);
}

async function rankHybrid(query, limit = 50) {
  const results = await vectorService.hybridSearch(query, limit);
  return results.map((e) => e.id);
}

async function main() {
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  await dbService.init();

  const allEvents = await dbService.getAllEvents();
  const indexReady = await vectorService.isIndexReady();

  const evaluations = { keyword: [], semantic: [], hybrid: [] };

  for (const item of golden) {
    const relevantIds = item.relevantEventIds || [];
    if (!relevantIds.length) continue;

    const kw = await rankKeyword(allEvents, item.query);
    evaluations.keyword.push({ relevantIds, rankedIds: kw });

    if (indexReady) {
      const sem = await rankSemantic(item.query);
      evaluations.semantic.push({ relevantIds, rankedIds: sem });
      const hyb = await rankHybrid(item.query);
      evaluations.hybrid.push({ relevantIds, rankedIds: hyb });
    }
  }

  const report = {
    at: new Date().toISOString(),
    eventCount: allEvents.length,
    semanticIndexReady: indexReady,
    queriesWithLabels: evaluations.keyword.length,
    keyword: summarizeSearchBenchmark(evaluations.keyword),
    semantic: evaluations.semantic.length
      ? summarizeSearchBenchmark(evaluations.semantic)
      : null,
    hybrid: evaluations.hybrid.length ? summarizeSearchBenchmark(evaluations.hybrid) : null,
    note:
      evaluations.keyword.length === 0
        ? 'Populate relevantEventIds in benchmarks/fixtures/search-golden.json after ingest'
        : undefined,
  };

  const outPath = path.join(__dirname, 'reports/search-quality.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('Search quality benchmark');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report written to ${outPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
