'use strict';

require('dotenv').config();

const REQUIRED = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GEMINI_API_KEY',
  'CHANNEL_SERVICE_URL',
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    `[env] Missing required environment variables: ${missing.join(', ')}\n` +
      `      Copy .env.example to .env and fill in the values.`
  );
  process.exit(1);
}

module.exports = {
  PORT:                parseInt(process.env.PORT || '4000', 10),
  SUPABASE_URL:        process.env.SUPABASE_URL,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  GEMINI_API_KEY:      process.env.GEMINI_API_KEY,
  CHANNEL_SERVICE_URL: process.env.CHANNEL_SERVICE_URL,
  NODE_ENV:            process.env.NODE_ENV || 'development',
};
