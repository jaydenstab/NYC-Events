#!/usr/bin/env node
/**
 * Ingest pipeline throughput on fixture events (no network scrapers).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { resetDatabaseForTests } = require('../services/db');
const dbService = require('../services/dbService');
const { validateOnly } = require('../services/ingestPipeline');
const { removeDuplicates } = require('../utils/dedupe');
const { normalizeEvent } = require('../utils/eventNormalize');

const fixturePath = path.join(__dirname, '../test/fixtures/valid-events.json');

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function main() {
  const dataDir = path.join(__dirname, '../data');
  fs.mkdirSync(dataDir, { recursive: true });
  process.env.TEST_DB_PATH = path.join(dataDir, 'bench-throughput.db');
  process.env.SKIP_GEOCODE = 'true';
  process.env.SKIP_EVENT_VALIDATION = 'false';
  resetDatabaseForTests();
  await dbService.init();

  const fixtures = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  const batch = [];
  for (let i = 0; i < 100; i++) {
    for (const raw of fixtures) {
      batch.push(
        normalizeEvent('bench', {
          ...raw,
          id: undefined,
          name: `${raw.name} ${i}`,
          date: '2099-06-15',
        })
      );
    }
  }

  const latencies = [];
  const t0 = performance.now();
  let validated = 0;

  for (const raw of batch) {
    const t1 = performance.now();
    const result = await validateOnly(raw);
    latencies.push(performance.now() - t1);
    if (result.ok) validated += 1;
  }

  const unique = removeDuplicates(
    (
      await Promise.all(
        batch.map(async (raw) => {
          const r = await validateOnly(raw);
          return r.ok ? r.event : null;
        })
      )
    ).filter(Boolean)
  );

  const totalMs = performance.now() - t0;
  latencies.sort((a, b) => a - b);

  const report = {
    at: new Date().toISOString(),
    inputCount: batch.length,
    validatedCount: validated,
    uniqueAfterDedupe: unique.length,
    totalMs: Math.round(totalMs),
    eventsPerSecond: Math.round((batch.length / totalMs) * 1000),
    latencyMs: {
      p50: Math.round(percentile(latencies, 50)),
      p95: Math.round(percentile(latencies, 95)),
      p99: Math.round(percentile(latencies, 99)),
    },
  };

  const outPath = path.join(__dirname, 'reports/ingest-throughput.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  try {
    fs.unlinkSync(process.env.TEST_DB_PATH);
  } catch {
    /* ignore */
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
