const express = require('express');
const { requireMetricsAuth } = require('../middleware/requireApiKey');
const metrics = require('../services/metrics');
const { asyncHandler } = require('../utils/errorUtils');

const router = express.Router();

router.get(
  '/',
  requireMetricsAuth,
  asyncHandler(async (req, res) => {
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.getMetricsText());
  })
);

module.exports = router;
