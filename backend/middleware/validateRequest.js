const { z } = require('zod');
const { sendSafeError } = require('../utils/errorUtils');

const validateRequest = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body !== undefined) req.body = parsed.body;
    if (parsed.query !== undefined) req.query = parsed.query;
    if (parsed.params !== undefined) req.params = parsed.params;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        requestId: req.id,
        error: 'VALIDATION_ERROR',
        details: error.errors.map((e) => ({ path: e.path, message: e.message })),
      });
    }
    sendSafeError(res, 500, error, 'Validation failed');
  }
};

module.exports = { validateRequest };
