#!/usr/bin/env node
/**
 * Production-profile ingest + smoke-ingest. Exit non-zero on failure.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const env = {
  ...process.env,
  USE_LOCAL_AI: 'false',
  SCRAPER_CONCURRENCY: '1',
  SCRAPER_NYC_PARKS_ENABLED: 'false',
  SCRAPER_NYC_GO_ENABLED: 'false',
  SCRAPER_UNION_SQUARE_ENABLED: 'false',
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: backendDir, env, stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log('verify-ingest: db:reset');
run('node', ['scripts/db-reset.js']);
console.log('verify-ingest: ingest');
run('node', ['scripts/ingest.js']);
console.log('verify-ingest: smoke-ingest');
run('node', ['scripts/smoke-ingest.js']);
console.log('verify-ingest: OK');
