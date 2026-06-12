/**
 * NYC-local date helpers (America/New_York).
 */

function todayNYC() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

module.exports = { todayNYC };
