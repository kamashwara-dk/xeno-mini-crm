'use strict';

/**
 * Simple request logger middleware.
 * Logs: METHOD path — statusCode (durationMs)
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${req.method} ${req.path} — ${res.statusCode} (${ms}ms)`);
  });
  next();
};

module.exports = requestLogger;
