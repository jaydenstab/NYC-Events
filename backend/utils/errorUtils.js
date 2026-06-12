const { logger, isProd } = require('../logger');
const { AppError } = require('./AppError');

function sendSafeError(res, status, err, publicMessage) {
  const requestId = res.req?.id;

  logger.error('request_failed', {
    requestId,
    status,
    message: err && err.message,
    stack: isProd ? undefined : err && err.stack,
  });

  if (isProd) {
    res.status(status).json({
      ok: false,
      requestId,
      error: 'INTERNAL',
      message: publicMessage || 'Something went wrong',
    });
  } else {
    res.status(status).json({
      ok: false,
      requestId,
      error: err && err.message ? String(err.message) : 'Error',
      message: (err && err.message) || publicMessage || 'Something went wrong',
    });
  }
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function globalErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  const status = err instanceof AppError ? err.statusCode : err.statusCode || 500;
  const code = err instanceof AppError ? err.code : err.code || 'INTERNAL_ERROR';

  logger.error('unhandled_request_error', {
    code,
    message: err.message,
    path: req.path,
    stack: isProd ? undefined : err.stack,
  });

  const body = {
    ok: false,
    requestId: req.id,
    error: err.message,
    code,
  };
  if (code === 'SEMANTIC_NOT_READY') {
    body.retryAfterMs = 5000;
  }
  res.status(status).json(body);
}

module.exports = { sendSafeError, asyncHandler, globalErrorHandler };
