#!/usr/bin/env node
/**
 * Scraper extraction accuracy on golden HTML/API fixtures (offline).
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { parseJsonLd } = require('../utils/jsonLdParser');
const EventbriteScraper = require('../eventbriteScraper');

const goldenPath = path.join(__dirname, 'fixtures/eventbrite-golden.json');
const testFixturesDir = path.join(__dirname, '../test/fixtures');

function loadFixture(name) {
  return fs.readFileSync(path.join(testFixturesDir, name), 'utf8');
}

function fieldMatch(actual, expected, mode = 'contains') {
  if (expected == null) return true;
  if (actual == null) return false;
  const a = String(actual).toLowerCase();
  const e = String(expected).toLowerCase();
  if (mode === 'exact') return a === e;
  return a.includes(e) || e.includes(a);
}

function evaluateGoldenEntry(entry, scraper) {
  const result = { id: entry.id, passed: true, checks: {} };

  if (entry.html_fixture) {
    const html = loadFixture(entry.html_fixture);
    const $ = cheerio.load(html);
    const events = parseJsonLd($, 'eventbrite');
    const domEvents = scraper._parseHtml(html, 'fixture');
    const merged = events.length > 0 ? events : domEvents;
    const ev = merged[0];

    if (entry.expected.min_events != null) {
      result.checks.min_events = merged.length >= entry.expected.min_events;
    }
    if (entry.expected.name_contains && ev) {
      result.checks.name = fieldMatch(ev.name, entry.expected.name_contains);
    }
    if (entry.expected.name && ev) {
      result.checks.name = fieldMatch(ev.name, entry.expected.name, 'exact');
    }
    if (entry.expected.date && ev) {
      result.checks.date = ev.date === entry.expected.date;
    }
    if (entry.expected.address_contains && ev) {
      result.checks.address = fieldMatch(ev.address, entry.expected.address_contains);
    }
    if (entry.expected.price && ev) {
      result.checks.price = fieldMatch(ev.price, entry.expected.price);
    }
    if (entry.expected.description_contains && ev) {
      result.checks.description = fieldMatch(ev.description, entry.expected.description_contains);
    }
  }

  if (entry.api_fixture) {
    const json = JSON.parse(loadFixture(entry.api_fixture));
    const parsed = scraper._parseApiResponse(json);
    const idx = entry.event_index ?? 0;
    const ev = parsed[idx];
    if (entry.expected.name) {
      result.checks.name = fieldMatch(ev?.name, entry.expected.name, 'exact');
    }
    if (entry.expected.date) {
      result.checks.date = ev?.date === entry.expected.date;
    }
    if (entry.expected.address_contains) {
      result.checks.address = fieldMatch(ev?.address, entry.expected.address_contains);
    }
    if (entry.expected.price) {
      result.checks.price = fieldMatch(ev?.price, entry.expected.price);
    }
  }

  result.passed = Object.values(result.checks).every(Boolean);
  return result;
}

function summarize(results) {
  const fieldStats = {};
  let passed = 0;

  for (const r of results) {
    if (r.passed) passed += 1;
    for (const [field, ok] of Object.entries(r.checks)) {
      if (!fieldStats[field]) fieldStats[field] = { pass: 0, total: 0 };
      fieldStats[field].total += 1;
      if (ok) fieldStats[field].pass += 1;
    }
  }

  const fieldRates = Object.fromEntries(
    Object.entries(fieldStats).map(([field, s]) => [
      field,
      { rate: s.total > 0 ? s.pass / s.total : 0, pass: s.pass, total: s.total },
    ])
  );

  return {
    samples: results.length,
    passed,
    pass_rate: results.length > 0 ? passed / results.length : 0,
    field_rates: fieldRates,
    date_completeness: fieldRates.date?.rate ?? null,
    address_completeness: fieldRates.address?.rate ?? null,
    description_completeness: fieldRates.description?.rate ?? null,
  };
}

function main() {
  const golden = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));
  const scraper = new EventbriteScraper();
  const results = golden.map((entry) => evaluateGoldenEntry(entry, scraper));
  const summary = summarize(results);

  const report = {
    at: new Date().toISOString(),
    scraper: 'eventbrite',
    ...summary,
    entries: results,
  };

  const outPath = path.join(__dirname, 'reports/scraper-accuracy.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (summary.pass_rate < 1) {
    process.exitCode = 1;
  }
}

main();
