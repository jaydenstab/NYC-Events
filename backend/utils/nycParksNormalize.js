const chrono = require('chrono-node');

/**
 * Parse NYC Parks raw date/time strings into canonical event fields.
 */
function parseParksDateTime(rawDate, rawTime, referenceDate = new Date()) {
  const combined = [rawDate, rawTime].filter((s) => s && String(s).trim()).join(' ');
  let date = 'TBD';
  let startTime = 'TBD';

  if (combined.trim()) {
    const parsed = chrono.parse(combined, referenceDate, { forwardDate: true });
    if (parsed.length > 0) {
      const start = parsed[0].start.date();
      date = start.toISOString().split('T')[0];
      if (parsed[0].start.isCertain('hour')) {
        startTime = start.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      }
    }
  }

  return { date, startTime };
}

function formatParksAddress(location) {
  const loc = (location || '').trim();
  if (!loc || loc === 'NYC Parks') return 'New York, NY';
  if (/new york/i.test(loc)) return loc;
  return `${loc}, New York, NY`;
}

module.exports = { parseParksDateTime, formatParksAddress };
