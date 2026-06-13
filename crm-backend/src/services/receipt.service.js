'use strict';

const supabase = require('../config/supabase');

// ─── STATUS_RANK ──────────────────────────────────────────────────────────────
// Critical for idempotency: a callback with equal or lower rank is silently ignored.
// 'delivered' and 'failed' share rank 2 — they are mutually exclusive at that stage.

const STATUS_RANK = {
  pending:   0,
  sent:      1,
  delivered: 2,
  failed:    2,
  opened:    3,
  read:      4,
  clicked:   5,
  ordered:   6,
};

// stats that trigger campaign completion check
const TERMINAL_STATUSES = new Set(['delivered', 'failed']);

// processes a single delivery callback, idempotently
async function processCallback({ commId, status, timestamp }) {
  // 1. Fetch the communication row
  const { data: rows, error: fetchErr } = await supabase
    .from('communications')
    .select('*')
    .eq('comm_id', commId)
    .limit(1);

  if (fetchErr) {
    console.warn(`[receipt] DB fetch error for commId ${commId}: ${fetchErr.message}`);
    return;
  }

  if (!rows || rows.length === 0) {
    console.warn(`[receipt] Unknown commId: ${commId} — ignoring`);
    return;
  }

  const comm = rows[0];

  // 2. skip if we've already seen a later status for this message
  const incomingRank = STATUS_RANK[status];
  const currentRank  = comm.status_rank ?? STATUS_RANK[comm.status] ?? 0;

  if (incomingRank === undefined) {
    console.warn(`[receipt] Unknown status "${status}" for commId ${commId} — ignoring`);
    return;
  }

  if (incomingRank <= currentRank) {
    // Duplicate or out-of-order callback — silently skip
    return;
  }

  // 3. Update communication status + rank
  const { error: updateErr } = await supabase
    .from('communications')
    .update({
      status:      status,
      status_rank: incomingRank,
      updated_at:  new Date().toISOString(),
    })
    .eq('comm_id', commId);

  if (updateErr) {
    console.error(`[receipt] Failed to update comm ${commId}: ${updateErr.message}`);
    return;
  }

  // 4. Insert status history row
  const { error: histErr } = await supabase
    .from('communication_status_history')
    .insert({
      comm_id:     commId,
      status:      status,
      occurred_at: timestamp || new Date().toISOString(),
    });

  if (histErr) {
    // Non-fatal — log and continue
    console.error(`[receipt] Failed to insert history for ${commId}: ${histErr.message}`);
  }

  // 5. Increment campaign stat via RPC
  const { error: statErr } = await supabase.rpc('increment_campaign_stat', {
    p_campaign_id: comm.campaign_id,
    p_stat_name:   status,
  });

  if (statErr) {
    console.error(`[receipt] Failed to increment stat_${status} for campaign ${comm.campaign_id}: ${statErr.message}`);
  }

  // 6. Check for campaign completion after terminal statuses
  if (TERMINAL_STATUSES.has(status)) {
    await checkCampaignCompletion(comm.campaign_id);
  }
}

// marks the campaign completed when no comms remain in pending or sent
async function checkCampaignCompletion(campaignId) {
  const { count, error } = await supabase
    .from('communications')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .in('status', ['pending', 'sent']);

  if (error) {
    console.error(`[receipt] Completion check failed for ${campaignId}: ${error.message}`);
    return;
  }

  if (count === 0) {
    const { error: completeErr } = await supabase
      .from('campaigns')
      .update({ status: 'completed' })
      .eq('id', campaignId);

    if (completeErr) {
      console.error(`[receipt] Failed to mark campaign ${campaignId} completed: ${completeErr.message}`);
    } else {
      console.log(`[receipt] Campaign ${campaignId} marked completed`);
    }
  }
}

module.exports = { processCallback, STATUS_RANK };
