#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { normalizeEvent } = require('../utils/eventNormalize');

const goldenPath = path.join(__dirname, 'fixtures/dedupe-golden.json');

function toEvent(raw, idx) {
  return normalizeEvent('bench', {
    ...raw,
    description: raw.description || 'Benchmark event',
    category: raw.category || 'Other',
  });
}

function loadDedupeAtThreshold(threshold) {
  process.env.DEDUPE_SIMILARITY_THRESHOLD = String(threshold);
  delete require.cache[require.resolve('../configs/constants')];
  delete require.cache[require.resolve('../utils/dedupe')];
  return require('../utils/dedupe').isFuzzyDuplicate;
}

function evaluatePairs(pairs, expectDuplicate, threshold) {
  const fuzzy = loadDedupeAtThreshold(threshold);
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  for (const [a, b] of pairs) {
    const evA = toEvent(a);
    const evB = toEvent(b);
    const dup = fuzzy(evA, [evB]);
    if (expectDuplicate && dup) tp += 1;
    else if (expectDuplicate && !dup) fn += 1;
    else if (!expectDuplicate && dup) fp += 1;
    else tn += 1;
  }

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  return { tp, fp, tn, fn, precision, recall, threshold };
}

async function main() {
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const thresholds = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
  const curve = thresholds.map((t) => ({
    ...evaluatePairs(golden.trueDuplicates, true, t),
    label: 'trueDuplicates',
  }));

  const defaultThreshold = 0.85;
  const trueDup = evaluatePairs(golden.trueDuplicates, true, defaultThreshold);
  const nearMiss = evaluatePairs(golden.nearMisses, false, defaultThreshold);

  const report = {
    at: new Date().toISOString(),
    defaultThreshold,
    trueDuplicates: trueDup,
    nearMisses: nearMiss,
    thresholdCurve: curve,
  };

  const outPath = path.join(__dirname, 'reports/dedupe-accuracy.json');
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
