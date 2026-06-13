'use strict';

const axios = require('axios');
const env   = require('../config/env');
const { sleep } = require('../utils/retry');

/**
 * dispatchBatch(communications)
 *
 * POSTs the communication batch to the channel service.
 * Payload shape per item:
 *   { commId, recipient: { name, phone, email }, message, channel }
 *
 * Retries once on failure (2s delay).
 * Fire-and-forget — never throws; errors are logged only.
 */
async function dispatchBatch(communications) {
  const payload = communications.map((c) => ({
    commId:    c.comm_id,
    recipient: {
      name:  c.customer_name  || '',
      phone: c.customer_phone || '',
      email: c.customer_email || '',
    },
    message: c.message,
    channel: c.channel,
  }));

  const send = async () => {
    const res = await axios.post(
      `${env.CHANNEL_SERVICE_URL}/send`,
      payload,
      { timeout: 10000 }
    );
    return res.data;
  };

  try {
    await send();
  } catch (firstErr) {
    console.warn(`[channel.client] First dispatch attempt failed: ${firstErr.message} — retrying in 2s`);
    await sleep(2000);
    try {
      await send();
    } catch (secondErr) {
      // Fire-and-forget: log and move on, never throw
      console.error(`[channel.client] Dispatch failed after retry: ${secondErr.message}`);
    }
  }
}

module.exports = { dispatchBatch };
