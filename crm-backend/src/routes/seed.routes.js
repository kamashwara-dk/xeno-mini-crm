'use strict';

const express = require('express');
const { generateSeedData } = require('../../seed/generateSeedData');

const router = express.Router();

/**
 * POST /api/seed
 * Wipes all data and reseeds 200 demo customers + their orders.
 */
router.post('/', async (_req, res, next) => {
  try {
    const result = await generateSeedData();
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
