'use strict';

const express  = require('express');
const supabase = require('../config/supabase');
const { createFromBrief, sendCampaign } = require('../services/campaign.service');

const router = express.Router();

router.post('/brief', async (req, res, next) => {
  try {
    const { brief } = req.body;
    if (!brief || typeof brief !== 'string' || !brief.trim()) {
      return res.status(400).json({ error: 'brief is required' });
    }
    const result = await createFromBrief(brief.trim());
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/send', async (req, res, next) => {
  try {
    const campaign = await sendCampaign(req.params.id);
    res.json({ data: campaign });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Campaign not found' });
      throw error;
    }
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

// shape: { id, name, status, audienceSize, stats: { sent, delivered, ... } }
router.get('/:id/stats', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, status, audience_size, stat_sent, stat_delivered, stat_failed, stat_opened, stat_read, stat_clicked, stat_ordered')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'Campaign not found' });
      throw error;
    }

    res.json({
      data: {
        id:           data.id,
        name:         data.name,
        status:       data.status,
        audienceSize: data.audience_size,
        stats: {
          sent:      data.stat_sent,
          delivered: data.stat_delivered,
          failed:    data.stat_failed,
          opened:    data.stat_opened,
          read:      data.stat_read,
          clicked:   data.stat_clicked,
          ordered:   data.stat_ordered,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
