const { AppError } = require('../utils/AppError');
const readiness = require('../services/readiness');

function requireSemanticReady(req, res, next) {
  if (req.query.semantic !== 'true') return next();

  if (readiness.isVectorModelReady() || !readiness.isSemanticEnabled()) {
    return next();
  }

  return next(
    new AppError('Semantic search model is not ready', 503, 'SEMANTIC_NOT_READY')
  );
}

module.exports = { requireSemanticReady };
