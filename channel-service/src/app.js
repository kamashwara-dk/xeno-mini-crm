'use strict';

// Validate env vars on startup
const env = require('./config/env');

const express = require('express');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/send', require('./routes/send.routes'));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`Channel Service running on port ${env.PORT} [${env.NODE_ENV}]`);
});

module.exports = app;
