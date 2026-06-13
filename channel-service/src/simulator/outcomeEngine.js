'use strict';

// ─── Per-channel delivery weights ─────────────────────────────────────────────
// Each value is the independent probability of that event occurring,
// GIVEN that the prerequisite event already occurred (cascade model).

const WEIGHTS = {
  whatsapp: { delivered: 0.88, opened: 0.65, read: 0.72, clicked: 0.28, ordered: 0.09 },
  sms:      { delivered: 0.82, opened: 0.30, read: 0.22, clicked: 0.12, ordered: 0.06 },
  email:    { delivered: 0.75, opened: 0.28, read: 0.42, clicked: 0.32, ordered: 0.10 },
  rcs:      { delivered: 0.85, opened: 0.58, read: 0.68, clicked: 0.24, ordered: 0.08 },
};

// ─── Delay helpers ────────────────────────────────────────────────────────────

const randBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// returns the delivery event sequence for a message, with realistic delays
function resolve(channel) {
  const w       = WEIGHTS[channel] || WEIGHTS.whatsapp;
  const outcomes = [];

  // sent is always the first event
  let elapsed = randBetween(300, 800);
  outcomes.push({ status: 'sent', delayMs: elapsed });

  // ── Step 2: delivered OR failed (mutually exclusive) ─────────────────────
  elapsed += randBetween(1000, 4000);
  const isDelivered = Math.random() < w.delivered;
  outcomes.push({ status: isDelivered ? 'delivered' : 'failed', delayMs: elapsed });

  if (!isDelivered) {
    // Message failed — cascade stops here
    return outcomes;
  }

  // ── Step 3: opened (only if delivered) ───────────────────────────────────
  if (Math.random() >= w.opened) return outcomes;
  elapsed += randBetween(2000, 8000);
  outcomes.push({ status: 'opened', delayMs: elapsed });

  // ── Step 4: read (only if opened) ────────────────────────────────────────
  if (Math.random() >= w.read) return outcomes;
  elapsed += randBetween(500, 3000);
  outcomes.push({ status: 'read', delayMs: elapsed });

  // ── Step 5: clicked (only if read) ───────────────────────────────────────
  if (Math.random() >= w.clicked) return outcomes;
  elapsed += randBetween(500, 2000);
  outcomes.push({ status: 'clicked', delayMs: elapsed });

  // ── Step 6: ordered (only if clicked) ────────────────────────────────────
  if (Math.random() >= w.ordered) return outcomes;
  elapsed += randBetween(2000, 10000);
  outcomes.push({ status: 'ordered', delayMs: elapsed });

  return outcomes;
}

module.exports = { resolve, WEIGHTS };
