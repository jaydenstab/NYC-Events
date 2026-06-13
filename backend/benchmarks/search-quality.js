#!/usr/bin/env node
/**
 * Search quality benchmark: FTS, semantic, hybrid (RRF).
 * Requires DATABASE_URL and indexed vectors for semantic/hybrid.
 *
 * Usage:
 *   npm run bench:search
 *   npm run bench:search -- --strict
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const dbService = require('../services/dbService');
const vectorService = require('../services/vectorService');
const { summarizeSearchBenchmark } = require('./lib/metrics');

const goldenPath = path.join(__dirname, 'fixtures/search-golden.json');
const STRICT = process.argv.includes('--strict');
const HYBRID_P5_FLOOR = parseFloat(process.env.BENCH_HYBRID_P5_FLOOR || '0.4');

async function rankFts(query, limit = 50) {
  const results = await dbService.fullTextSearch(query, limit);
  return results.map((e) => e.id);
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

  const eventCount = await dbService.getEventCount();
  const indexReady = await vectorService.isIndexReady();

  const evaluations = { fts: [], semantic: [], hybrid: [] };
  const perQuery = [];

  for (const item of golden) {
    if (item.skip) continue;
    const relevantIds = item.relevantEventIds || [];
    if (!relevantIds.length) continue;

    const fts = await rankFts(item.query);
    evaluations.fts.push({ relevantIds, rankedIds: fts, query: item.query });

    let semantic = null;
    let hybrid = null;
    if (indexReady) {
      const sem = await rankSemantic(item.query);
      evaluations.semantic.push({ relevantIds, rankedIds: sem, query: item.query });
      semantic = sem;
      const hyb = await rankHybrid(item.query);
      evaluations.hybrid.push({ relevantIds, rankedIds: hyb, query: item.query });
      hybrid = hyb;
    }

    perQuery.push({
      query: item.query,
      relevantCount: relevantIds.length,
      ftsTop5: fts.slice(0, 5),
      semanticTop5: semantic ? semantic.slice(0, 5) : null,
      hybridTop5: hybrid ? hybrid.slice(0, 5) : null,
    });
  }

  const labeledCount = evaluations.fts.length;
  const report = {
    at: new Date().toISOString(),
    eventCount,
    semanticIndexReady: indexReady,
    queriesWithLabels: labeledCount,
    fts: summarizeSearchBenchmark(evaluations.fts),
    semantic: evaluations.semantic.length
      ? summarizeSearchBenchmark(evaluations.semantic)
      : null,
    hybrid: evaluations.hybrid.length ? summarizeSearchBenchmark(evaluations.hybrid) : null,
    perQuery,
    note:
      labeledCount === 0
        ? 'Populate relevantEventIds in benchmarks/fixtures/search-golden.json (npm run label:search-golden)'
        : undefined,
  };

  const outPath = path.join(__dirname, 'reports/search-quality.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('Search quality benchmark');
  console.log(JSON.stringify(report, null, 2));
  console.log(`Report written to ${outPath}`);

  if (labeledCount === 0) {
    process.exit(STRICT ? 1 : 0);
  }

  if (STRICT && report.hybrid?.precisionAt5 != null && report.hybrid.precisionAt5 < HYBRID_P5_FLOOR) {
    console.error(
      `Strict gate failed: hybrid P@5 ${report.hybrid.precisionAt5} < ${HYBRID_P5_FLOOR}`
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
