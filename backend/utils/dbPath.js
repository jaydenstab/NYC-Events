const path = require('path');

function resolveDatabasePath() {
  if (process.env.TEST_DB_PATH) return process.env.TEST_DB_PATH;
  if (process.env.DATABASE_PATH) return process.env.DATABASE_PATH;
  return path.join(__dirname, '../database.sqlite');
}

module.exports = { resolveDatabasePath };
