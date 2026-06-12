const { PostgresDatabase } = require('./postgres');
const { SqliteDatabase } = require('./sqlite');

function usePostgres() {
  return Boolean(process.env.DATABASE_URL && !process.env.TEST_DB_PATH);
}

function createDatabase() {
  if (usePostgres()) {
    return new PostgresDatabase(process.env.DATABASE_URL);
  }
  return new SqliteDatabase();
}

let singleton = null;

function getDatabase() {
  if (!singleton) singleton = createDatabase();
  return singleton;
}

function resetDatabaseForTests() {
  singleton = null;
}

function isPostgres() {
  return usePostgres();
}

module.exports = {
  createDatabase,
  getDatabase,
  resetDatabaseForTests,
  isPostgres,
};
