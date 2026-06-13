'use strict';

// Validate env vars first — exits process with clear message if any are missing
const env = require('./config/env');

const express       = require('express');
const cors          = require('cors');
const requestLogger = require('./middleware/requestLogger');
const errorHandler  = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://ai-mini-crm.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json());
app.use(requestLogger);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/campaigns', require('./routes/campaigns.routes'));
app.use('/api/receipts',  require('./routes/receipts.routes'));
app.use('/api/customers', require('./routes/customers.routes'));
app.use('/api/seed',      require('./routes/seed.routes'));

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(`CRM Backend running on port ${env.PORT} [${env.NODE_ENV}]`);
});

module.exports = app;
