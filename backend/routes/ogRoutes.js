const express = require('express');
const rateLimit = require('express-rate-limit');
const dbService = require('../services/dbService');
const { buildShareCardSvg } = require('../services/shareCardImage');
const { rowToEvent } = require('../utils/rowToEvent');
const { asyncHandler } = require('../utils/errorUtils');

const router = express.Router();

const ogLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

async function fetchEventForOg(id) {
  await dbService.init();
  const rows = await dbService.getEventsByIds([id]);
  const mapped = rowToEvent(rows[0]);
  if (!mapped) return null;
  return {
    ...mapped,
    time: mapped.startTime,
  };
}

router.get(
  '/event/:id.svg',
  ogLimiter,
  asyncHandler(async (req, res) => {
    const event = await fetchEventForOg(req.params.id);
    if (!event) {
      res.status(404).type('text/plain').send('Event not found');
      return;
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buildShareCardSvg(event));
  })
);

router.get(
  '/event/:id.png',
  ogLimiter,
  asyncHandler(async (req, res) => {
    const rawId = req.params.id.replace(/\.png$/i, '');
    const event = await fetchEventForOg(rawId);
    if (!event) {
      res.status(404).type('text/plain').send('Event not found');
      return;
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buildShareCardSvg(event));
  })
);

module.exports = router;
