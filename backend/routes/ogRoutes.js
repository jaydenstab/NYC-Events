const express = require('express');
const rateLimit = require('express-rate-limit');
const dbService = require('../services/dbService');
const { buildShareCardSvg } = require('../services/shareCardImage');
const { rowToEvent } = require('../utils/rowToEvent');
const { asyncHandler } = require('../utils/errorUtils');

let renderSvgToPng = null;
try {
  const { Resvg } = require('@resvg/resvg-js');
  renderSvgToPng = (svg) => {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
    return resvg.render().asPng();
  };
} catch {
  renderSvgToPng = null;
}

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

    const svg = buildShareCardSvg(event);
    if (renderSvgToPng) {
      const png = renderSvgToPng(svg);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(png);
      return;
    }

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(svg);
  })
);

module.exports = router;
