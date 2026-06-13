#!/usr/bin/env node
/**
 * Validate opt-in scrapers (NYC Parks, NYC Go, Union Square).
 * Runs full ingest with all three enabled, then smoke-ingest.
 * Separate from npm run verify (ship gate keeps opt-in scrapers disabled).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const env = {
  ...process.env,
  USE_LOCAL_AI: 'false',
  SCRAPER_CONCURRENCY: '1',
  SCRAPER_NYC_PARKS_ENABLED: 'true',
  SCRAPER_NYC_GO_ENABLED: 'true',
  SCRAPER_UNION_SQUARE_ENABLED: 'true',
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: backendDir, env, stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('verify-scrapers: per-source smoke (no DB)');
for (const source of ['nyc_parks', 'nyc_go', 'union_square']) {
  console.log(`verify-scrapers: smoke-scraper --source=${source}`);
  run('node', ['scripts/smoke-scraper.js', `--source=${source}`]);
}

console.log('verify-scrapers: db:reset');
run('node', ['scripts/db-reset.js']);
console.log('verify-scrapers: ingest (opt-in enabled)');
run('node', ['scripts/ingest.js']);
console.log('verify-scrapers: smoke-ingest');
run('node', ['scripts/smoke-ingest.js']);
console.log('verify-scrapers: OK');
