#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PostgresDatabase } = require('../services/db/postgres');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required for migrations');
    process.exit(1);
  }
  const db = new PostgresDatabase(process.env.DATABASE_URL);
  await db.init();
  console.log('Migrations applied.');
  await db.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
