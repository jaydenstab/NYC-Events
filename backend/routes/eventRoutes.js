const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const eventController = require('../controllers/eventController');
const { validateRequest } = require('../middleware/validateRequest');
const { requireApiKey } = require('../middleware/requireApiKey');
const { requireSemanticReady } = require('../middleware/requireSemanticReady');
const {
  RATE_LIMIT_EVENTS_PER_MIN,
  RATE_LIMIT_SEMANTIC_PER_MIN,
  SEARCH_MAX_QUERY_LENGTH,
} = require('../configs/constants');

const router = express.Router();

router.use(requireApiKey);

const eventQuerySchema = z.object({
  query: z.object({
    reddit: z.enum(['true', 'false']).optional(),
    semantic: z.enum(['true', 'false']).optional(),
    refresh: z.enum(['true', 'false']).optional(),
    search: z.string().max(SEARCH_MAX_QUERY_LENGTH).optional(),
    limit: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10), 1), 100) : undefined)),
    page: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform((v) => (v ? Math.max(parseInt(v, 10), 1) : undefined)),
    per_page: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .transform((v) => (v ? Math.min(Math.max(parseInt(v, 10), 1), 100) : undefined)),
    ids: z.string().max(2000).optional(),
  }),
});

const eventsListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_LIMIT_EVENTS_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', retryAfterMs: 60000 },
});

const eventsSemanticLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: RATE_LIMIT_SEMANTIC_PER_MIN,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.query.semantic !== 'true',
  message: { error: 'Too many semantic search requests', retryAfterMs: 60000 },
});

const eventsRefreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_REFRESH_PER_MIN, 10) || 3,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.query.refresh !== 'true',
});

const sourceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/reddit', sourceLimiter, eventController.deprecatedSourceHandler);
router.get('/bing-food', sourceLimiter, eventController.deprecatedSourceHandler);
router.get('/eventbrite', sourceLimiter, eventController.deprecatedSourceHandler);
router.get('/union-square', sourceLimiter, eventController.deprecatedSourceHandler);
router.get('/oh-my-rockness', sourceLimiter, eventController.deprecatedSourceHandler);
router.get('/simple', sourceLimiter, eventController.getSimpleEvents);
router.get('/realtime', eventsListLimiter, eventController.getRealtimeEvents);

router.get(
  '/',
  eventsListLimiter,
  eventsSemanticLimiter,
  eventsRefreshLimiter,
  requireSemanticReady,
  validateRequest(eventQuerySchema),
  eventController.getAggregatedEvents
);

module.exports = router;
