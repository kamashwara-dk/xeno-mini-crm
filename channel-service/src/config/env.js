'use strict';

require('dotenv').config();

const REQUIRED = ['CRM_CALLBACK_URL'];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `[env] Missing required environment variables: ${missing.join(', ')}\n` +
      `      Copy .env.example to .env and fill in the values.`
  );
  process.exit(1);
}

module.exports = {
  PORT:             parseInt(process.env.PORT || '5000', 10),
  CRM_CALLBACK_URL: process.env.CRM_CALLBACK_URL,
  NODE_ENV:         process.env.NODE_ENV || 'development',
};
