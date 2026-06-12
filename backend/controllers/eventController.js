const eventService = require('../services/eventService');
const eventQueryService = require('../services/eventQueryService');
const dbService = require('../services/dbService');
const cache = require('../cache');
const vectorService = require('../services/vectorService');
const { eventsEnvelope } = require('../utils/apiEnvelope');
const { sendSafeError, asyncHandler } = require('../utils/errorUtils');
const { resolveActiveSources } = require('../utils/activeSources');

const { EVENTS_CACHE_TTL_MS } = require('../configs/constants');
const DEFAULT_SEMANTIC_LIMIT = parseInt(process.env.SEMANTIC_SEARCH_LIMIT, 10) || 50;

function isSemanticEnabled() {
  return process.env.SEMANTIC_SEARCH_ENABLED !== 'false';
}

const DEPRECATED_SOURCE_MESSAGE =
  'Per-source scrape endpoints are removed. Use GET /api/events after npm run ingest.';

const MAX_IDS_PER_REQUEST = 50;

function parseEventIdsParam(raw) {
  if (!raw || typeof raw !== 'string') return [];
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(ids)];
}

function deprecatedSourceHandler(req, res) {
  res.status(410).json({
    ok: false,
    requestId: req.id,
    error: 'DEPRECATED_ENDPOINT',
    message: DEPRECATED_SOURCE_MESSAGE,
  });
}

class EventController {
  deprecatedSourceHandler = deprecatedSourceHandler;

  async getSimpleEvents(req, res) {
    try {
      const fallbackEvents = [
        {
          id: 'event_1',
          name: 'NYC Parks Free Fitness Class',
          description: 'Morning fitness class in Central Park, all levels welcome',
          address: 'Central Park, New York, NY 10024',
          startTime: '7:00 AM',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          price: 'Free',
          category: 'Health & Wellness',
          latitude: 40.7829,
          longitude: -73.9654,
          website: null,
          source: 'curated-fallback',
          locationQuality: 'geocoded',
        },
        {
          id: 'event_2',
          name: 'Brooklyn Museum Art Exhibition',
          description: 'Contemporary art exhibition featuring local and international artists',
          address: '200 Eastern Pkwy, Brooklyn, NY 11238',
          startTime: '10:00 AM',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          price: '$16',
          category: 'Art',
          latitude: 40.6712,
          longitude: -73.9631,
          website: null,
          source: 'curated-fallback',
          locationQuality: 'geocoded',
        },
      ];

      res.json(eventsEnvelope(fallbackEvents, {
        source: 'simple',
        message: 'Simple events loaded successfully',
      }));
    } catch (error) {
      sendSafeError(res, 500, error, 'Failed to load simple events');
    }
  }

  async getAggregatedEvents(req, res) {
    const idsParam = req.query.ids;
    const parsedIds = parseEventIdsParam(idsParam);

    if (parsedIds.length > 0) {
      if (parsedIds.length > MAX_IDS_PER_REQUEST) {
        return res.status(400).json({
          ok: false,
          error: 'TOO_MANY_IDS',
          message: `At most ${MAX_IDS_PER_REQUEST} ids allowed per request`,
        });
      }
      const hasConflict =
        req.query.search ||
        req.query.semantic === 'true' ||
        req.query.page ||
        req.query.refresh === 'true';
      if (hasConflict) {
        return res.status(400).json({
          ok: false,
          error: 'IDS_CONFLICT',
          message: 'ids cannot be combined with search, semantic, page, or refresh',
        });
      }

      try {
        await dbService.init();
        const events = await dbService.getEventsByIds(parsedIds);
        return res.json(
          eventsEnvelope(events, {
            totalCount: events.length,
            idsMode: true,
            requestedIds: parsedIds.length,
          })
        );
      } catch (error) {
        return sendSafeError(res, 500, error, 'Failed to fetch events by ids');
      }
    }

    const isSemantic = req.query.semantic === 'true';
    const searchQuery = eventQueryService.sanitizeSearchQuery(req.query.search || '');
    const indexVersion = vectorService.getIndexVersion();
    const cacheGen = await cache.getGeneration();

    if (isSemantic && !isSemanticEnabled()) {
      return res.status(400).json({
        ok: false,
        error: 'SEMANTIC_DISABLED',
        message: 'Semantic search is disabled on this server',
      });
    }

    const parsedLimit = req.query.limit
      ? Math.min(Math.max(parseInt(req.query.limit, 10) || DEFAULT_SEMANTIC_LIMIT, 1), 100)
      : DEFAULT_SEMANTIC_LIMIT;

    const forceRefresh = req.query.refresh === 'true';
    const cacheKey = `events:main:g${cacheGen}:${req.query.reddit || ''}:${searchQuery}:${isSemantic}:${parsedLimit}:v${indexVersion}`;
    if (!forceRefresh) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    try {
      const includeReddit = req.query.reddit === 'true';

      const page = req.query.page ? parseInt(req.query.page, 10) : null;
      const perPage = req.query.per_page ? parseInt(req.query.per_page, 10) : 50;

      const result = await eventService.getAggregatedEvents({
        includeReddit,
        searchQuery,
        semantic: isSemantic,
        forceRefresh,
        semanticLimit: parsedLimit,
        page: Number.isFinite(page) && page >= 1 ? page : null,
        perPage: Number.isFinite(perPage) && perPage >= 1 ? perPage : 50,
      });

      const events = Array.isArray(result) ? result : result.events;
      const serviceMeta = Array.isArray(result) ? {} : result.meta || {};

      const body = eventsEnvelope(events, {
        searchQuery: searchQuery || null,
        semantic: isSemantic,
        limit: isSemantic ? parsedLimit : null,
        semanticIndexReady: await vectorService.isIndexReady(),
        semanticIndexing: vectorService.isIndexing(),
        indexError: vectorService.getLastIndexError(),
        indexVersion: vectorService.getIndexVersion(),
        sources: resolveActiveSources({ includeReddit }),
        scrapedAt: new Date().toISOString(),
        ...serviceMeta,
      });

      if (!forceRefresh) {
        const ttl =
          serviceMeta.ingesting === true ? Math.min(EVENTS_CACHE_TTL_MS, 30_000) : EVENTS_CACHE_TTL_MS;
        await cache.set(cacheKey, body, ttl);
      }
      res.json(body);
    } catch (error) {
      sendSafeError(res, 500, error, 'Failed to fetch events');
    }
  }

  /** @deprecated Legacy realtime scrape path removed. Use GET /api/events after npm run ingest. */
  async getRealtimeEvents(req, res) {
    return res.status(410).json({
      ok: false,
      requestId: req.id,
      error: 'DEPRECATED_ENDPOINT',
      message: 'Realtime scrape endpoint removed. Use GET /api/events after npm run ingest.',
    });
  }
}

const controller = new EventController();

module.exports = {
  deprecatedSourceHandler: asyncHandler(controller.deprecatedSourceHandler.bind(controller)),
  getSimpleEvents: asyncHandler(controller.getSimpleEvents.bind(controller)),
  getAggregatedEvents: asyncHandler(controller.getAggregatedEvents.bind(controller)),
  getRealtimeEvents: asyncHandler(controller.getRealtimeEvents.bind(controller)),
};
