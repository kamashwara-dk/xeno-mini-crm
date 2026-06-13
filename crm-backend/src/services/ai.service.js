'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('../config/env');

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// gemini-2.5-flash: free tier, fast, reliable JSON output
const MODEL = 'gemini-2.5-flash';

// ─── System prompt (identical contract to the Anthropic version) ──────────────

const SYSTEM_PROMPT = `
You are a CRM intelligence engine for an Indian retail/consumer brand.

Given a marketer's plain-English campaign brief, return a JSON object with EXACTLY these fields:
1. "campaignName": short punchy name, max 8 words
2. "channel": one of exactly ["whatsapp", "sms", "email", "rcs"] — infer from brief or default "whatsapp"
3. "whereClause": a valid PostgreSQL WHERE clause string to filter rows from the "customers" table
4. "messageTemplate": personalised message using merge fields {{name}}, {{total_spend}}, {{days_since_last_order}}, {{order_count}}

Available columns in the "customers" table:
- name (TEXT)
- phone (TEXT)
- email (TEXT)
- preferred_channel (TEXT: 'whatsapp'|'sms'|'email'|'rcs')
- tags (TEXT array — values: 'vip','loyal','at-risk','new','kurta-buyer','skincare-fan',
         'coffee-lover','saree-buyer','accessory-hunter','home-decor')
- total_spend (NUMERIC — total rupees spent)
- order_count (INTEGER — total orders placed)
- last_order_date (TIMESTAMPTZ)
- days_since_last_order (INTEGER — pre-computed, use this for recency filters)
- created_at (TIMESTAMPTZ)

SQL RULES:
- Use ONLY the column names listed above
- For tag filters: use "tags @> ARRAY['value']::text[]"  e.g. tags @> ARRAY['vip']::text[]
- For date comparisons: use days_since_last_order (integer) NOT last_order_date
- whereClause must NOT include the word "WHERE" — just the condition expression
- whereClause must be valid PostgreSQL — no MongoDB syntax, no backticks
- messageTemplate: warm, conversational, under 160 chars for sms, longer for email/whatsapp

Return ONLY valid JSON. No markdown. No explanation. No code fences. Nothing outside the JSON.
`.trim();

// ─── Valid channel values ─────────────────────────────────────────────────────

const VALID_CHANNELS = new Set(['whatsapp', 'sms', 'email', 'rcs']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

// strips accidental markdown fences gemini sometimes wraps json in
function stripFences(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

// parses and validates the raw text from gemini — throws if any required field is missing or invalid
function parseAndValidate(raw) {
  const cleaned = stripFences(raw);
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`JSON parse failed: ${err.message} — raw: ${cleaned.slice(0, 200)}`);
  }

  const { campaignName, channel, whereClause, messageTemplate } = parsed;

  if (!campaignName || typeof campaignName !== 'string' || !campaignName.trim()) {
    throw new Error('Missing or empty campaignName');
  }
  if (!channel || !VALID_CHANNELS.has(channel)) {
    throw new Error(`Invalid channel: "${channel}" — must be one of ${[...VALID_CHANNELS].join(', ')}`);
  }
  if (!whereClause || typeof whereClause !== 'string' || !whereClause.trim()) {
    throw new Error('Missing or empty whereClause');
  }
  if (whereClause.trim().toUpperCase().startsWith('WHERE ')) {
    throw new Error('whereClause must NOT include the word WHERE');
  }
  if (!messageTemplate || typeof messageTemplate !== 'string' || !messageTemplate.trim()) {
    throw new Error('Missing or empty messageTemplate');
  }

  return {
    campaignName:    campaignName.trim(),
    channel,
    whereClause:     whereClause.trim(),
    messageTemplate: messageTemplate.trim(),
  };
}

// ─── Core API caller ─────────────────────────────────────────────────────────

async function callGemini(userContent) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      // Ask Gemini to return JSON directly — reduces fence wrapping
      responseMimeType: 'application/json',
      maxOutputTokens:  1024,
      temperature:      0.2,  // low temp = more deterministic SQL
    },
  });

  const result = await model.generateContent(userContent);
  return result.response.text();
}

// ─── Main export ─────────────────────────────────────────────────────────────

// calls gemini to interpret a plain-english campaign brief — retries once on parse failure with a stricter instruction
async function interpretBrief(briefText) {
  try {
    const raw = await callGemini(briefText);
    return parseAndValidate(raw);
  } catch (firstErr) {
    console.warn(`[ai.service] First attempt failed: ${firstErr.message} — retrying`);
  }

  // retry with stricter instruction
  try {
    const retryContent =
      briefText +
      '\n\nCRITICAL: return ONLY a raw JSON object, nothing else, ' +
      'not even a single character outside the JSON object.';
    const raw = await callGemini(retryContent);
    return parseAndValidate(raw);
  } catch (secondErr) {
    const err = new Error(secondErr.message);
    err.code = 'AI_PARSE_ERROR';
    throw err;
  }
}

module.exports = { interpretBrief };
