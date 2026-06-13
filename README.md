# Xeno AI-Native Mini CRM

> **Paradigm C: Campaign Brief → Full AI Execution**
> Xeno Engineering Internship Assignment — June 2026

---

## Live URL

_Deployed on Vercel — link to be added_

CRM Backend API: `https://<ec2-public-ip>:4000`
Channel Service: `https://<ec2-public-ip>:5000`

---

## What Is This?

A marketer opens the app and types a plain-English campaign brief:

> *"Re-engage customers who haven't bought in 60 days but spent over ₹5000. Send a WhatsApp message about our summer collection."*

The system takes it from there. An AI model (Google Gemini) interprets the brief, derives a PostgreSQL WHERE clause, queries a live Supabase database for matching customers, personalises a message for every one of them, and dispatches the entire campaign to a separate Channel Service simulator. The Channel Service fires async delivery callbacks back to the CRM, which updates live stats that the frontend polls every 3 seconds.

This is **Paradigm C** — the marketer writes a brief; the AI owns the execution.

---

## Architecture

![Architecture Diagram](docs/architecture.png)


---

## Local Development

### Prerequisites

- Node.js ≥ 20
- A Supabase project (free tier works)
- A Google Gemini API key (free at [aistudio.google.com](https://aistudio.google.com))

### Step 1 — Clone and install

```bash
git clone <repo-url>
cd xeno-mini-crm

# Install all three services
npm install --prefix crm-backend
npm install --prefix channel-service
npm install --prefix crm-frontend
```

### Step 2 — Set up Supabase

See the **Supabase Setup** section below.

### Step 3 — Configure environment variables

```bash
# CRM Backend
cp crm-backend/.env.example crm-backend/.env
# Fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, GEMINI_API_KEY

# Channel Service
cp channel-service/.env.example channel-service/.env
# CRM_CALLBACK_URL defaults to http://localhost:4000/api/receipts/callback

# Frontend
cp crm-frontend/.env.example crm-frontend/.env
# VITE_API_BASE_URL defaults to http://localhost:4000
```

### Step 4 — Start all three services

Open three terminal windows:

```bash
# Terminal 1 — CRM Backend
cd crm-backend
npm run dev          # nodemon, port 4000

# Terminal 2 — Channel Service
cd channel-service
npm run dev          # nodemon, port 5000

# Terminal 3 — Frontend
cd crm-frontend
npm run dev          # Vite, port 5173
```

### Step 5 — Seed demo data

```bash
curl -X POST http://localhost:4000/api/seed
# → { "data": { "total": 200, "atRiskCount": 74 } }
```

Or click **"🌱 Seed Demo Data"** on the Customers page.

### Step 6 — Run a campaign

1. Open `http://localhost:5173`
2. Click one of the example brief chips or type your own
3. Click **"Run Campaign with AI →"**
4. Review the audience preview and sample message
5. Click **"Send to N customers →"**
6. Watch the live delivery dashboard update in real time

---

## Supabase Setup

### 1. Create a project

Go to [supabase.com](https://supabase.com) → New project.

### 2. Run the schema

In your Supabase dashboard → **SQL Editor**, paste and run the entire contents of:

```
crm-backend/src/models/schema.sql
```

This creates all tables and the three required RPC functions:
- `filter_customers(where_clause TEXT)` — dynamic audience segmentation
- `increment_campaign_stat(p_campaign_id UUID, p_stat_name TEXT)` — atomic stat bumps
- `wipe_all_data()` — used by the seed endpoint

### 3. Disable RLS (for service-role backend access)

In SQL Editor, run:

```sql
ALTER TABLE customers                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders                     DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns                  DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_audience          DISABLE ROW LEVEL SECURITY;
ALTER TABLE communications             DISABLE ROW LEVEL SECURITY;
ALTER TABLE communication_status_history DISABLE ROW LEVEL SECURITY;
```

> The backend uses the `service_role` key which bypasses RLS, but disabling it
> avoids edge cases with PostgREST's schema cache on new projects.

### 4. Reload the schema cache

In SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

### 5. Get your credentials

Go to **Project Settings → API**:
- **Project URL** → `SUPABASE_URL` (must be the base URL, e.g. `https://xxxx.supabase.co`, no trailing path)
- **service_role secret** → `SUPABASE_SERVICE_KEY`

---

## Environment Variables

### `crm-backend/.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `4000` |
| `SUPABASE_URL` | Supabase project base URL | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Service-role JWT (bypasses RLS) | `eyJhbGci...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIzaSy...` |
| `CHANNEL_SERVICE_URL` | Channel service base URL | `http://localhost:5000` |
| `NODE_ENV` | Runtime environment | `development` |

### `channel-service/.env`

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `CRM_CALLBACK_URL` | Full URL to CRM receipts endpoint | `http://localhost:4000/api/receipts/callback` |
| `NODE_ENV` | Runtime environment | `development` |

### `crm-frontend/.env`

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | CRM backend base URL | `http://localhost:4000` |

---

## Production Deployment (AWS)

### PM2

Both backend services include `ecosystem.config.js` for PM2:

```bash
# On EC2
npm install -g pm2

cd crm-backend
pm2 start ecosystem.config.js --env production

cd ../channel-service
pm2 start ecosystem.config.js --env production

pm2 save
pm2 startup
```

### Frontend (S3 + CloudFront)

```bash
cd crm-frontend
npm run build
aws s3 sync dist/ s3://<your-bucket> --delete
# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id <id> --paths "/*"
```

---

## Scale Tradeoffs

This project makes deliberate scope decisions to ship a working prototype by the deadline. Here is an honest comparison of each choice:

| For this scope | At production scale |
|---|---|
| `setTimeout`-based async delivery queue | SQS + Lambda workers with dead-letter queues |
| Single EC2 instance for both services | Independent auto-scaling groups per service |
| Supabase free tier (shared infra) | Supabase Pro or self-hosted Postgres on RDS |
| 3-second polling for live stats | WebSocket or Supabase Realtime subscriptions |
| Manual `.env` files on EC2 | AWS Secrets Manager with IAM rotation |
| No authentication or authorisation | JWT-based auth + Supabase Row Level Security |
| Single Gemini API key | API key rotation, rate-limit handling, fallback models |
| In-memory setTimeout delivery simulation | Persistent job queue (Bull, BullMQ) with Redis |
| Sequential seed wipe (fetch → batch delete) | PostgreSQL `TRUNCATE ... CASCADE` via migration |
| Monorepo, all services co-located | Independent repos with CI/CD per service |

### What was deliberately NOT built

Per the spec, these are explicitly out of scope:

- ❌ Real messaging provider integration (Twilio, SendGrid, WhatsApp Business API)
- ❌ Campaign scheduling or drip sequences
- ❌ Role-based access control or multi-user auth
- ❌ Manual segment rule builder UI
- ❌ Supabase Realtime (3s polling is sufficient for demo)
- ❌ Unit/integration test suite
- ❌ Docker or containerisation
- ❌ Sales CRM features (pipelines, deals, tickets)

---

## How the AI Works

The core of this app is the brief-to-campaign pipeline. When a marketer submits a
plain-English brief, it gets sent to the Gemini API with a system prompt that includes
the full customer schema. The model returns structured JSON with three things: a SQL WHERE
clause for segmentation, the right channel for the message, and a personalised message
template using merge fields.

The WHERE clause runs through a Supabase RPC function that executes it safely against
the customers table. Message templates are then hydrated per-recipient before dispatch.

I spent real time on making the prompt reliable — it includes explicit field names,
data types, and SQL rules so the model doesn't hallucinate column names or return MongoDB
syntax. On parse failure, the service retries once with a stricter instruction.

---

## API Reference

### CRM Backend (port 4000)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/campaigns/brief` | Interpret brief + create draft campaign |
| `POST` | `/api/campaigns/:id/send` | Send a draft campaign |
| `GET` | `/api/campaigns` | List all campaigns (newest first, limit 20) |
| `GET` | `/api/campaigns/:id` | Get single campaign |
| `GET` | `/api/campaigns/:id/stats` | Get live delivery stats |
| `POST` | `/api/receipts/callback` | Receive delivery callback from channel service |
| `GET` | `/api/customers` | Paginated customer list with optional name search |
| `POST` | `/api/seed` | Wipe and reseed 200 demo customers |

All responses: `{ data: ... }` on success, `{ error: "message" }` on failure.

### Channel Service (port 5000)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/send` | Accept batch of communications, returns `{ accepted: N }` immediately |

---

## Project Structure

```
xeno-mini-crm/
├── crm-backend/          Node.js + Express, port 4000
│   ├── src/
│   │   ├── config/       env validation + Supabase client singleton
│   │   ├── models/       schema.sql (run once in Supabase)
│   │   ├── services/     ai · segment · campaign · receipt · channel client
│   │   ├── routes/       campaigns · receipts · customers · seed
│   │   ├── middleware/   requestLogger · errorHandler
│   │   └── utils/        personalise · retry
│   └── seed/             generateSeedData.js (200 demo customers)
│
├── channel-service/      Node.js + Express, port 5000, stateless
│   └── src/
│       ├── simulator/    outcomeEngine (weighted cascade) · deliveryQueue
│       └── utils/        callbackSender (exponential backoff retry)
│
└── crm-frontend/         React 18 + Vite 5 + TailwindCSS 3, port 5173
    └── src/
        ├── api/          Axios client wrapping all CRM endpoints
        ├── hooks/        useCampaignStats (3s polling)
        ├── components/   ChannelBadge · StatCard · AudiencePreview
        └── pages/        HomePage · CampaignPage · CampaignsListPage · CustomersPage
```

---

*Built for the Xeno Engineering Internship Assignment — June 2026*
