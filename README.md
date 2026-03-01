# AgriKonnect Front Desk — Internal App

An internal single-page web app for the AgriKonnect front desk team to log daily contact activities, track follow-ups, and review daily summaries.

**Stack:** Vite + React + TypeScript + Tailwind CSS + Supabase + Netlify

---

## Table of Contents

1. [Local Development](#1-local-development)
2. [Supabase Setup](#2-supabase-setup)
3. [Creating Users & Profiles](#3-creating-users--profiles)
4. [Netlify Deployment](#4-netlify-deployment)
5. [Database Schema Reference](#5-database-schema-reference)
6. [App Features](#6-app-features)

---

## 1. Local Development

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier is fine)

### Steps

```bash
# 1. Clone / open the project
cd AgriKonnect-Internal-App

# 2. Install dependencies
npm install

# 3. Create your local env file
cp .env.example .env.local
# Then edit .env.local and fill in your Supabase URL and anon key

# 4. Start the dev server
npm run dev
# App runs at http://localhost:5173
```

### Where to find your Supabase credentials

1. Go to [supabase.com](https://supabase.com) → your project
2. Settings → API
3. Copy **Project URL** → `VITE_SUPABASE_URL`
4. Copy **anon / public** key → `VITE_SUPABASE_ANON_KEY`

---

## 2. Supabase Setup

### Run the schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor** → **New query**
3. Paste the entire contents of [`supabase/schema.sql`](./supabase/schema.sql)
4. Click **Run**

This creates:
- `profiles` table with RLS
- `daily_logs` table with RLS
- All indexes
- `is_admin()` helper function
- All Row Level Security policies

### Enable Email Auth

1. Supabase Dashboard → **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. Optionally disable "Confirm email" for an internal tool (Authentication → Settings → uncheck "Enable email confirmations")

---

## 3. Creating Users & Profiles

Because `profiles` references `auth.users`, you must:

**Step 1 — Create the auth user**

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Enter email + password
3. Copy the generated **User UUID**

**Step 2 — Insert the profile row**

Go to **SQL Editor** and run:

```sql
-- For admin user
INSERT INTO public.profiles (id, full_name, role)
VALUES ('paste-uuid-here', 'Admin Name', 'admin');

-- For front desk user
INSERT INTO public.profiles (id, full_name, role)
VALUES ('paste-uuid-here', 'Staff Name', 'frontdesk');
```

You can also do this via the **Table Editor** → `profiles` table → Insert row.

> **Note:** You can create multiple users and profiles. The `assigned_to` dropdown in the New Log form pulls all active profiles.

---

## 4. Netlify Deployment

### Option A: Netlify UI (recommended for first deploy)

1. Push this repo to GitHub (or GitLab/Bitbucket)
2. Go to [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
3. Connect your repo
4. Build settings (auto-detected from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Go to **Site settings** → **Environment variables** → Add:
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
6. Deploy

### Option B: Netlify CLI

```bash
npm install -g netlify-cli
netlify login
netlify init
netlify env:set VITE_SUPABASE_URL "https://your-project.supabase.co"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
netlify deploy --prod
```

> **Important:** The `netlify.toml` file already includes the SPA redirect rule (`/* → /index.html`) so React Router works correctly on direct URL access and refresh.

---

## 5. Database Schema Reference

### `profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, references `auth.users(id)` |
| `full_name` | text | Required |
| `role` | text | `'frontdesk'` or `'admin'` |
| `is_active` | boolean | Default `true` |
| `created_at` | timestamptz | Auto |

### `daily_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | PK, auto |
| `created_at` | timestamptz | Auto |
| `created_by` | uuid | FK → `profiles.id` |
| `contact_type` | text | `farmer\|buyer\|distributor\|partner\|inquiry` |
| `channel` | text | `walk-in\|phone\|whatsapp\|tiktok\|instagram\|website\|referral\|other` |
| `contact_name` | text | Optional |
| `phone` | text | Required |
| `region` | text | Required |
| `district` | text | Required |
| `community` | text | Optional |
| `gps_code` | text | Optional |
| `intent` | text | `sell\|buy\|distributor\|logistics\|pricing\|support\|other` |
| `crop` | text | Optional (shown when intent=sell/buy) |
| `quantity` | text | Optional (shown when crop filled) |
| `timeframe` | text | `now\|1_week\|1_month\|unknown` |
| `outcome` | text | `resolved\|referred\|scheduled_callback\|not_qualified\|pending` |
| `followup_needed` | boolean | Default `false` |
| `followup_datetime` | timestamptz | Required when follow-up needed |
| `assigned_to` | uuid | FK → `profiles.id` |
| `followup_status` | text | `none\|pending\|done` |
| `followup_done_at` | timestamptz | Set when marked done |
| `followup_done_note` | text | Optional note when marked done |
| `notes` | text | Free-form notes |

### RLS Summary

| Table | Operation | Policy |
|-------|-----------|--------|
| `profiles` | SELECT | Own row only (or all rows if admin) |
| `daily_logs` | INSERT | `created_by = auth.uid()` |
| `daily_logs` | SELECT | Any authenticated user |
| `daily_logs` | UPDATE | Own row or admin |

To restrict `SELECT` to admins only, see the commented-out policy in `supabase/schema.sql`.

---

## 6. App Features

### New Log (`/new`)
Log a new contact interaction. Fields auto-show/hide based on selections (e.g. Crop only shows for sell/buy intent). Follow-up toggle reveals date/time and assignee fields.

### Today (`/today`)
KPI cards for total logs, farmers, buyers, and follow-ups due today. Full table of today's logs. Click any row to open a detail side panel with edit capability (notes + outcome).

### Follow-ups (`/followups`)
Three tabs:
- **Due Today** — pending follow-ups with `followup_datetime` today
- **Overdue** — pending follow-ups past their due date
- **All Pending** — all unresolved follow-ups

Click **Mark Done** on any row to open a modal, add a note, and resolve the follow-up. The row disappears immediately (optimistic update).
