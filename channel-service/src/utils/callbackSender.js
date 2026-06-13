'use strict';

const axios = require('axios');

// ─── Exponential backoff config ───────────────────────────────────────────────
const RETRY_DELAYS = [1000, 2000, 4000]; // ms between attempts 1→2, 2→3, 3→fail
const MAX_ATTEMPTS = 3;

// resolves after ms milliseconds
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// posts a delivery status back to the CRM, retries up to 3 times on failure
async function sendCallback(callbackUrl, payload) {
  let lastErr;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await axios.post(callbackUrl, payload, { timeout: 8000 });
      // Success — done
      return;
    } catch (err) {
      lastErr = err;

      const status = err.response?.status;

      // 4xx = client error, don't retry
      if (status && status >= 400 && status < 500) {
        console.warn(
          `[callbackSender] 4xx response (${status}) for commId ${payload.commId} — not retrying`
        );
        return;
      }

      // Last attempt — give up
      if (attempt === MAX_ATTEMPTS) break;

      // Wait before next attempt (exponential backoff)
      const delay = RETRY_DELAYS[attempt - 1];
      console.warn(
        `[callbackSender] Attempt ${attempt} failed for commId ${payload.commId} ` +
          `(${err.message}) — retrying in ${delay}ms`
      );
      await sleep(delay);
    }
  }

  // All attempts exhausted — log permanently and return (never throw)
  console.error(
    `[callbackSender] Permanently failed to deliver callback for commId ${payload.commId}: ` +
      lastErr.message
  );
}

module.exports = { sendCallback };
