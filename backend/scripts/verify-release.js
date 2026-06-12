#!/usr/bin/env node
/**
 * Full ship gate (backend): unit tests + production-profile ingest/smoke.
 * See /SHIP_GATE.md — do not git push until this exits 0.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const rootDir = path.join(backendDir, '..');

function run(cwd, cmd, args, env = process.env) {
  const r = spawnSync(cmd, args, { cwd, env, stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    console.error(`verify-release failed: ${cmd} ${args.join(' ')}`);
    process.exit(r.status ?? 1);
  }
}

console.log('=== verify-release: backend test:unit ===');
run(backendDir, 'npm', ['run', 'test:unit']);

console.log('=== verify-release: production ingest + smoke ===');
run(backendDir, 'npm', ['run', 'verify:ingest']);

console.log('=== verify-release: data quality audit ===');
run(backendDir, 'npm', ['run', 'audit:quality']);

console.log('=== verify-release: frontend test + build ===');
run(path.join(rootDir, 'frontend'), 'npm', ['run', 'test', '--', '--run']);
run(path.join(rootDir, 'frontend'), 'npm', ['run', 'build']);

console.log('verify-release: ALL PASSED — safe to commit/push per SHIP_GATE.md');
