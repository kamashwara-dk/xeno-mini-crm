'use strict';

const express = require('express');
const { processCallback } = require('../services/receipt.service');

const router = express.Router();

router.post('/callback', (req, res) => {
  const { commId, status, timestamp } = req.body;

  // Validate required fields — return 400 synchronously
  if (!commId || !status) {
    return res.status(400).json({ error: 'commId and status are required' });
  }

  // respond before processing so the channel service doesn't time out waiting
  res.status(200).json({ received: true });

  processCallback({ commId, status, timestamp }).catch((err) => {
    console.error(`[receipts] processCallback error for ${commId}: ${err.message}`);
  });
});

module.exports = router;
