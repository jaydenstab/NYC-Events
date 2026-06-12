#!/usr/bin/env node
/**
 * NER / extraction field accuracy on golden fixtures.
 * Set USE_LOCAL_AI=true for full pipeline (slow).
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const chrono = require('chrono-node');
const nerService = require('../services/nerService');

const goldenPath = path.join(__dirname, 'fixtures/ner-golden.json');

function normalizeField(value) {
  if (!value || value === 'TBD' || value === 'New York, NY') return '';
  return String(value).toLowerCase().trim();
}

function fieldMatch(expected, actual) {
  const e = normalizeField(expected);
  const a = normalizeField(actual);
  if (!e) return true;
  if (!a) return false;
  return a.includes(e) || e.includes(a);
}

function extractChronoOnly(text) {
  const referenceDate = new Date();
  const parsed = chrono.parse(text, referenceDate);
  let date = 'TBD';
  let startTime = 'TBD';
  if (parsed.length > 0) {
    const d = parsed[0].start.date();
    date = d.toISOString().split('T')[0];
    if (parsed[0].start.isCertain('hour')) {
      startTime = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
  }
  return { date, startTime, address: 'New York, NY' };
}

async function main() {
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const fields = ['date', 'address', 'startTime'];
  const stats = {
    fullPipeline: { total: 0, byField: {} },
    chronoOnly: { total: 0, byField: {} },
  };
  for (const f of fields) {
    stats.fullPipeline.byField[f] = { exact: 0, partial: 0 };
    stats.chronoOnly.byField[f] = { exact: 0, partial: 0 };
  }

  for (const item of golden) {
    const expected = item.expected || {};
    stats.fullPipeline.total += 1;
    stats.chronoOnly.total += 1;

    let extracted = null;
    if (process.env.USE_LOCAL_AI !== 'false') {
      try {
        extracted = await nerService.extract(item.text);
      } catch {
        extracted = null;
      }
    }
    const chronoResult = extractChronoOnly(item.text);

    for (const mode of ['fullPipeline', 'chronoOnly']) {
      const result = mode === 'fullPipeline' ? extracted : chronoResult;
      if (!result) continue;
      for (const f of fields) {
        if (fieldMatch(expected[f], result[f])) {
          stats[mode].byField[f].partial += 1;
          if (normalizeField(expected[f]) === normalizeField(result[f])) {
            stats[mode].byField[f].exact += 1;
          }
        }
      }
    }
  }

  const report = {
    at: new Date().toISOString(),
    samples: golden.length,
    useLocalAi: process.env.USE_LOCAL_AI !== 'false',
    fullPipeline: Object.fromEntries(
      fields.map((f) => [
        f,
        {
          partialRate:
            stats.fullPipeline.total > 0
              ? stats.fullPipeline.byField[f].partial / stats.fullPipeline.total
              : 0,
          exactRate:
            stats.fullPipeline.total > 0
              ? stats.fullPipeline.byField[f].exact / stats.fullPipeline.total
              : 0,
        },
      ])
    ),
    chronoOnly: Object.fromEntries(
      fields.map((f) => [
        f,
        {
          partialRate: stats.chronoOnly.byField[f].partial / stats.chronoOnly.total,
          exactRate: stats.chronoOnly.byField[f].exact / stats.chronoOnly.total,
        },
      ])
    ),
  };

  const outPath = path.join(__dirname, 'reports/ner-accuracy.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
