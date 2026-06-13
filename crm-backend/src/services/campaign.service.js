'use strict';

const { v4: uuidv4 }      = require('uuid');
const supabase             = require('../config/supabase');
const { interpretBrief }  = require('./ai.service');
const { previewSegment, resolveSegment } = require('./segment.service');
const { personalise }     = require('../utils/personalise');
const channelClient        = require('./channel.client');

// ─── createFromBrief ─────────────────────────────────────────────────────────

// interprets a brief via AI, previews the audience, and inserts a draft campaign
async function createFromBrief(briefText) {
  // Step 1: AI interpretation
  const { campaignName, channel, whereClause, messageTemplate } = await interpretBrief(briefText);

  // Step 2: Audience preview
  const { count: audienceSize, sampleCustomers } = await previewSegment(whereClause);

  // Step 3: Build a sample personalised message using the first matching customer
  const sampleMessage = sampleCustomers.length > 0
    ? personalise(messageTemplate, sampleCustomers[0])
    : messageTemplate;

  // Step 4: Insert campaign as draft
  const { data: rows, error } = await supabase
    .from('campaigns')
    .insert({
      name:             campaignName,
      brief:            briefText,
      channel,
      segment_where:    whereClause,
      message_template: messageTemplate,
      audience_size:    audienceSize,
      status:           'draft',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create campaign: ${error.message}`);

  return {
    campaign:       rows,
    audienceSize,
    sampleMessage,
    sampleCustomers,
    channel,
  };
}

// ─── sendCampaign ─────────────────────────────────────────────────────────────

// resolves full audience, creates communications, marks campaign as sending, and dispatches to channel service
async function sendCampaign(campaignId) {
  // Step 1: Fetch campaign
  const { data: campaign, error: fetchErr } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .single();

  if (fetchErr || !campaign) {
    const err = new Error('Campaign not found');
    err.status = 404;
    throw err;
  }

  if (campaign.status !== 'draft') {
    const err = new Error(`Campaign is already ${campaign.status}`);
    err.status = 400;
    throw err;
  }

  // Step 2: Audience size guard
  if (!campaign.audience_size || campaign.audience_size === 0) {
    const err = new Error('Cannot send campaign with zero audience');
    err.status = 400;
    throw err;
  }

  // Step 3: Resolve full audience
  const { customers, count } = await resolveSegment(campaign.segment_where);

  if (count === 0) {
    const err = new Error('No customers matched the segment — cannot send');
    err.status = 400;
    throw err;
  }

  // Step 4: Insert campaign_audience rows in batches of 100
  const audienceRows = customers.map((c) => ({
    campaign_id: campaignId,
    customer_id: c.id,
  }));

  const BATCH = 100;
  for (let i = 0; i < audienceRows.length; i += BATCH) {
    const { error: audErr } = await supabase
      .from('campaign_audience')
      .insert(audienceRows.slice(i, i + BATCH));
    if (audErr) throw new Error(`Failed to insert campaign_audience: ${audErr.message}`);
  }

  // Step 5: Create one communication per customer
  const communications = customers.map((customer) => ({
    comm_id:     uuidv4(),
    campaign_id: campaignId,
    customer_id: customer.id,
    channel:     campaign.channel,
    message:     personalise(campaign.message_template, customer),
    status:      'pending',
    status_rank: 0,
    // Attach customer info for channel client payload (not stored)
    customer_name:  customer.name,
    customer_phone: customer.phone,
    customer_email: customer.email,
  }));

  // Insert communications (strip the ephemeral customer_* fields before DB insert)
  const commRows = communications.map(({ customer_name, customer_phone, customer_email, ...rest }) => rest);

  for (let i = 0; i < commRows.length; i += BATCH) {
    const { error: commErr } = await supabase
      .from('communications')
      .insert(commRows.slice(i, i + BATCH));
    if (commErr) throw new Error(`Failed to insert communications: ${commErr.message}`);
  }

  // Step 6: Update campaign → sending
  const { data: updated, error: updateErr } = await supabase
    .from('campaigns')
    .update({
      status:        'sending',
      audience_size: count,
      sent_at:       new Date().toISOString(),
    })
    .eq('id', campaignId)
    .select()
    .single();

  if (updateErr) throw new Error(`Failed to update campaign status: ${updateErr.message}`);

  // Step 7: Fire-and-forget dispatch (do NOT await the result)
  channelClient.dispatchBatch(communications);

  // Step 8: Return updated campaign
  return updated;
}

module.exports = { createFromBrief, sendCampaign };
