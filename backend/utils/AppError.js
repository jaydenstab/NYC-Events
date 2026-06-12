class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

class ScraperError extends AppError {
  constructor(source, message) {
    super(message, 502, 'SCRAPER_ERROR');
    this.source = source;
  }
}

module.exports = { AppError, ValidationError, ScraperError };
