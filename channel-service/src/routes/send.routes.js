'use strict';

const express  = require('express');
const env      = require('../config/env');
const { enqueue } = require('../simulator/deliveryQueue');

const router = express.Router();

router.post('/', (req, res) => {
  const body = req.body;

  // Validate: must be a non-empty array
  if (!Array.isArray(body) || body.length === 0) {
    return res.status(400).json({ error: 'Request body must be a non-empty array of communications' });
  }

  // respond right away, delivery happens in the background
  res.json({ accepted: body.length });

  enqueue(body, env.CRM_CALLBACK_URL);
});

module.exports = router;
