-- ============================================================
-- Run this once in Supabase SQL editor before starting the app
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- CUSTOMERS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  preferred_channel     TEXT CHECK (preferred_channel IN ('whatsapp','sms','email','rcs'))
                        DEFAULT 'whatsapp',
  tags                  TEXT[] DEFAULT '{}',
  total_spend           NUMERIC(12,2) DEFAULT 0,
  order_count           INTEGER DEFAULT 0,
  last_order_date       TIMESTAMPTZ,
  days_since_last_order INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- ORDERS TABLE (separate, FK to customers)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id            UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_ref              TEXT NOT NULL,
  amount                 NUMERIC(10,2) NOT NULL,
  category               TEXT CHECK (category IN
                           ('kurtas','sarees','accessories','skincare','coffee','home-decor')),
  order_date             TIMESTAMPTZ NOT NULL,
  attributed_campaign_id UUID,
  created_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);

-- ─────────────────────────────────────────
-- CAMPAIGNS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             TEXT NOT NULL,
  brief            TEXT NOT NULL,
  channel          TEXT CHECK (channel IN ('whatsapp','sms','email','rcs')),
  segment_where    TEXT,         -- AI-generated SQL WHERE clause string
  message_template TEXT,
  audience_size    INTEGER DEFAULT 0,
  status           TEXT CHECK (status IN ('draft','sending','completed')) DEFAULT 'draft',
  stat_sent        INTEGER DEFAULT 0,
  stat_delivered   INTEGER DEFAULT 0,
  stat_failed      INTEGER DEFAULT 0,
  stat_opened      INTEGER DEFAULT 0,
  stat_read        INTEGER DEFAULT 0,
  stat_clicked     INTEGER DEFAULT 0,
  stat_ordered     INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  sent_at          TIMESTAMPTZ
);

-- ─────────────────────────────────────────
-- CAMPAIGN_AUDIENCE TABLE (many-to-many)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaign_audience (
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_ca_campaign_id ON campaign_audience(campaign_id);

-- ─────────────────────────────────────────
-- COMMUNICATIONS TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comm_id      TEXT UNIQUE NOT NULL,   -- UUID v4 assigned at creation; idempotency key
  campaign_id  UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id  UUID NOT NULL REFERENCES customers(id),
  channel      TEXT CHECK (channel IN ('whatsapp','sms','email','rcs')),
  message      TEXT,
  status       TEXT CHECK (status IN
                 ('pending','sent','delivered','failed',
                  'opened','read','clicked','ordered'))
               DEFAULT 'pending',
  status_rank  INTEGER DEFAULT 0,      -- mirrors STATUS_RANK for idempotent updates
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comm_comm_id     ON communications(comm_id);
CREATE INDEX IF NOT EXISTS idx_comm_campaign_id ON communications(campaign_id);

-- ─────────────────────────────────────────
-- COMMUNICATION_STATUS_HISTORY TABLE
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comm_id     TEXT NOT NULL,
  status      TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_csh_comm_id ON communication_status_history(comm_id);

-- ─────────────────────────────────────────
-- RPC: filter_customers
-- Called by segment.service.js to execute AI-generated WHERE clauses safely.
-- Must be run alongside the table DDL above.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION filter_customers(where_clause TEXT)
RETURNS SETOF customers
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY EXECUTE
    'SELECT * FROM customers WHERE ' || where_clause ||
    ' ORDER BY total_spend DESC LIMIT 500';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Invalid filter: %', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────
-- RPC: increment_campaign_stat
-- Called by receipt.service.js to atomically bump one stat column.
-- Must be run alongside the table DDL above.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_campaign_stat(p_campaign_id UUID, p_stat_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format(
    'UPDATE campaigns SET %I = %I + 1 WHERE id = $1',
    'stat_' || p_stat_name,
    'stat_' || p_stat_name
  ) USING p_campaign_id;
END;
$$;

-- ─────────────────────────────────────────
-- RPC: wipe_all_data
-- Called by the seed route to safely truncate all tables in FK order.
-- Must be run alongside the table DDL above.
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION wipe_all_data()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM communication_status_history;
  DELETE FROM communications;
  DELETE FROM campaign_audience;
  DELETE FROM campaigns;
  DELETE FROM orders;
  DELETE FROM customers;
END;
$$;
