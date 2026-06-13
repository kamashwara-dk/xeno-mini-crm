'use strict';

const { v4: uuidv4 } = require('uuid');
const supabase = require('../src/config/supabase');

// ─── Name pools ────────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  'Aarav', 'Arjun', 'Vikram', 'Rohit', 'Amit',
  'Priya', 'Neha', 'Pooja', 'Sunita', 'Kavya',
  'Karthik', 'Suresh', 'Venkat', 'Ravi', 'Anand',
  'Deepa', 'Lakshmi', 'Meena', 'Padma', 'Revathi',
  'Mihir', 'Nikhil', 'Jayesh', 'Hardik', 'Yash',
  'Hetal', 'Foram', 'Riddhi', 'Minal', 'Komal',
  'Rahul', 'Sanjay', 'Naveen', 'Deepak', 'Ajay',
  'Anjali', 'Swati', 'Divya', 'Rekha', 'Sneha',
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Verma',
  'Iyer', 'Nair', 'Pillai', 'Reddy', 'Rao',
  'Shah', 'Mehta', 'Desai', 'Joshi', 'Trivedi',
  'Gupta', 'Agarwal', 'Malhotra', 'Kapoor', 'Bose',
];

const CHANNELS   = ['whatsapp', 'sms', 'email', 'rcs'];
const CATEGORIES = ['kurtas', 'sarees', 'accessories', 'skincare', 'coffee', 'home-decor'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const randInt   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randFloat = (min, max) => Math.random() * (max - min) + min;
const randItem  = (arr) => arr[Math.floor(Math.random() * arr.length)];

const daysAgoDate = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(randInt(7, 22), randInt(0, 59), randInt(0, 59), 0);
  return d;
};

const categoryTag = (cat) => ({
  kurtas: 'kurta-buyer', sarees: 'saree-buyer',
  accessories: 'accessory-hunter', skincare: 'skincare-fan',
  coffee: 'coffee-lover', 'home-decor': 'home-decor',
}[cat] || cat);

// ─── Wipe helper ─────────────────────────────────────────────────────────────
// Strategy: fetch all IDs then delete them. Works on empty tables (no IDs = skip).
// This avoids PostgREST's "Invalid path" bug with filter-based bulk deletes on empty tables.

async function wipeTable(table, idCol = 'id') {
  // Fetch all IDs (select only the key column, max 10000 rows)
  const { data, error: fetchErr } = await supabase
    .from(table)
    .select(idCol)
    .limit(10000);

  if (fetchErr) throw new Error(`wipeTable select ${table}: ${fetchErr.message}`);
  if (!data || data.length === 0) return; // already empty — nothing to do

  const ids = data.map((r) => r[idCol]);

  // Delete in batches of 100 to avoid URL length limits on the .in() filter
  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error: delErr } = await supabase
      .from(table)
      .delete()
      .in(idCol, chunk);
    if (delErr) throw new Error(`wipeTable delete ${table}: ${delErr.message}`);
  }
}

// campaign_audience has a composite PK — wipe via campaign_id
async function wipeCampaignAudience() {
  const { data, error: fetchErr } = await supabase
    .from('campaign_audience')
    .select('campaign_id')
    .limit(10000);

  if (fetchErr) throw new Error(`wipeTable select campaign_audience: ${fetchErr.message}`);
  if (!data || data.length === 0) return;

  const ids = [...new Set(data.map((r) => r.campaign_id))];

  const BATCH = 100;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error: delErr } = await supabase
      .from('campaign_audience')
      .delete()
      .in('campaign_id', chunk);
    if (delErr) throw new Error(`wipeTable delete campaign_audience: ${delErr.message}`);
  }
}

// ─── Core generator ───────────────────────────────────────────────────────────

function buildSeedPayload() {
  const now       = new Date();
  const customers = [];
  const orders    = [];

  for (let i = 0; i < 200; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName  = LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length];
    const name      = `${firstName} ${lastName}`;

    const phone             = `+91-9${String(randInt(100000000, 999999999))}`;
    const email             = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const preferred_channel = CHANNELS[i % 4];

    // Recency buckets (spec-required):
    // 0–49:    61–180 days ago  → guaranteed at-risk
    // 50–99:   30–90 days ago
    // 100–199: 1–60 days ago
    let lastOrderDaysAgo;
    if (i < 50)       lastOrderDaysAgo = randInt(61, 180);
    else if (i < 100) lastOrderDaysAgo = randInt(30, 90);
    else              lastOrderDaysAgo = randInt(1, 60);

    const numOrders  = randInt(1, 10);
    const customerId = uuidv4();
    const customerOrders = [];

    for (let j = 0; j < numOrders; j++) {
      const orderDaysAgo = j === 0
        ? lastOrderDaysAgo
        : lastOrderDaysAgo + randInt(1, 120);

      customerOrders.push({
        id:          uuidv4(),
        customer_id: customerId,
        order_ref:   `ORD-${customerId.slice(0, 8).toUpperCase()}-${j + 1}`,
        amount:      parseFloat(randFloat(300, 15000).toFixed(2)),
        category:    randItem(CATEGORIES),
        order_date:  daysAgoDate(orderDaysAgo).toISOString(),
      });
    }

    const total_spend           = parseFloat(customerOrders.reduce((s, o) => s + o.amount, 0).toFixed(2));
    const order_count           = customerOrders.length;
    const last_order_date       = customerOrders[0].order_date;
    const days_since_last_order = Math.floor((now - new Date(last_order_date)) / 86400000);

    const tags = [];
    if (total_spend > 30000)                             tags.push('vip');
    if (order_count >= 5)                                tags.push('loyal');
    if (days_since_last_order > 60)                      tags.push('at-risk');
    if (order_count === 1 && days_since_last_order < 30) tags.push('new');

    const catFreq = {};
    customerOrders.forEach((o) => { catFreq[o.category] = (catFreq[o.category] || 0) + 1; });
    const topCat = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0][0];
    tags.push(categoryTag(topCat));

    customers.push({
      id: customerId,
      name,
      phone,
      email,
      preferred_channel,
      tags,
      total_spend,
      order_count,
      last_order_date,
      days_since_last_order,
    });

    orders.push(...customerOrders);
  }

  return { customers, orders };
}

// ─── Main export ──────────────────────────────────────────────────────────────

// wipes all tables and inserts 200 demo customers with orders
async function generateSeedData() {
  // 1. Wipe in FK-safe order (fetch-then-delete avoids PostgREST empty-table bug)
  await wipeTable('communication_status_history');
  await wipeTable('communications');
  await wipeCampaignAudience();
  await wipeTable('campaigns');
  await wipeTable('orders');
  await wipeTable('customers');

  const { customers, orders } = buildSeedPayload();

  // 2. Insert all 200 customers
  const { error: custErr } = await supabase.from('customers').insert(customers);
  if (custErr) throw new Error(`Failed to insert customers: ${custErr.message}`);

  // 3. Insert orders in batches of 50
  const BATCH = 50;
  for (let i = 0; i < orders.length; i += BATCH) {
    const batch = orders.slice(i, i + BATCH);
    const { error: ordErr } = await supabase.from('orders').insert(batch);
    if (ordErr) throw new Error(`Failed to insert orders batch ${Math.floor(i / BATCH) + 1}: ${ordErr.message}`);
  }

  const atRiskCount = customers.filter((c) => c.days_since_last_order > 60).length;

  return {
    message:     'Seeded 200 customers',
    total:       customers.length,
    atRiskCount,
  };
}

module.exports = { generateSeedData };
