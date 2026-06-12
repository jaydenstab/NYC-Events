#!/usr/bin/env node
/**
 * Delete local SQLite DB (dev reset). Re-run ingest or hit /api/events?refresh=true after.
 * Optimized for WAL mode: cleans up -shm and -wal sidecar files.
 */
const fs = require('fs');
const { resolveDatabasePath } = require('../utils/dbPath');

const dbPath = resolveDatabasePath();
const walPath = dbPath + '-wal';
const shmPath = dbPath + '-shm';

const files = [dbPath, walPath, shmPath];

files.forEach(f => {
  if (fs.existsSync(f)) {
    try {
      fs.unlinkSync(f);
      console.log('✅ Removed', f);
    } catch (err) {
      console.error('❌ Failed to remove', f, err.message);
    }
  }
});

if (!fs.existsSync(dbPath)) {
  console.log('✨ Database reset complete.');
}
