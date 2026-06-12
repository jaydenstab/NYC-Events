const isProd = process.env.NODE_ENV === 'production';

/**
 * @param {'info'|'warn'|'error'|'debug'} level
 * @param {string} message
 * @param {Record<string, unknown>} [fields]
 */
function format(level, message, fields) {
  const base = {
    level,
    event: message,
    message,
    ts: new Date().toISOString(),
  };
  if (fields && Object.keys(fields).length) {
    return JSON.stringify({ ...base, ...fields });
  }
  return JSON.stringify(base);
}

const logger = {
  /** @param {string} message @param {Record<string, unknown>} [fields] */
  info(message, fields) {
    console.log(format('info', message, fields));
  },
  /** @param {string} message @param {Record<string, unknown>} [fields] */
  warn(message, fields) {
    console.warn(format('warn', message, fields));
  },
  /** @param {string} message @param {Record<string, unknown>} [fields] */
  error(message, fields) {
    console.error(format('error', message, fields));
  },
  /** @param {string} message @param {Record<string, unknown>} [fields] */
  debug(message, fields) {
    if (!isProd) {
      console.log(format('debug', message, fields));
    }
  },
};

module.exports = { logger, isProd };
