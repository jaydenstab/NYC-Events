/**
 * Standard JSON envelope for event list endpoints.
 */
function eventsEnvelope(events, meta = {}) {
  return {
    ok: true,
    events,
    meta: {
      totalCount: Array.isArray(events) ? events.length : 0,
      ...meta,
    },
  };
}

module.exports = { eventsEnvelope };
