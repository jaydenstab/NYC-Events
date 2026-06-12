const express = require('express');
const { requireApiKey } = require('../middleware/requireApiKey');
const { asyncHandler } = require('../utils/errorUtils');
const { computeDataQuality } = require('../services/dataQualityService');
const metrics = require('../services/metrics');

const router = express.Router();

router.get(
  '/quality',
  requireApiKey,
  asyncHandler(async (req, res) => {
    const quality = await computeDataQuality();
    metrics.setDataQualityGauges(quality);
    res.json({ ok: true, requestId: req.id, ...quality });
  })
);

module.exports = router;
