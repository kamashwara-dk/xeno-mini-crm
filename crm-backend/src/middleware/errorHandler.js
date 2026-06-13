'use strict';

const env = require('../config/env');

/**
 * Global Express error handler — must be registered LAST (4-arg signature).
 * Always returns { error: message }. Never returns HTML.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';

  if (env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
