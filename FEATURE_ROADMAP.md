# AgriKonnect FrontDesk — Feature Development Roadmap
**For:** Project Manager | **Updated:** March 2026

---

## SPRINT 1 — Critical Fixes (3-5 days)

### 1. Run SQL Migration 001
File: `supabase/migration_001_growth_fields.sql`
- Adds: whatsapp_number, language_preference, lead_temperature, verification_status
- Adds: ambassador_id, referral_source_name, price_offered, farm_size_acres
- Creates: ambassadors table, market_prices table
- Creates: crop_demand_summary view
Action: Copy file contents → Supabase SQL Editor → Run

### 2. Update NewLogPage.tsx Form Fields
Add to the New Log form:
- WhatsApp Number field (text input, next to phone)
- Language Preference (select: English, Twi, Ga, Hausa, Dagbani, Ewe, Other)
- Lead Temperature (radio buttons: Hot / Warm / Cold with color indicators)
- Referral Source Name (shows when channel = 'referral')
- Ambassador ID (shows when channel = 'referral', dropdown from ambassadors table)
- Price Offered (numeric, shows when intent = 'sell' or 'buy')
- Price Unit (select: per kg, per 50kg bag, per crate, etc.)
- Farm Size Acres (numeric, shows when contact_type = 'farmer')
- Payment Method Preference (select: MTN MoMo, Vodafone Cash, etc.)

### 3. Fix Crop Matching — Case Insensitive Normalization
In matching.ts, the ilike query is already case-insensitive — good!
But the UI allows free-text crop entry which leads to 'Tomato', 'tomatoes', 'TOMATO' as separate entries.
Fix: Convert crop field from TextInput to ComboBox/Autocomplete:
- Show existing crop names from DB as suggestions
- Normalize on save: trim + lowercase
This makes matchInList() far more accurate.

### 4. Phone Duplicate Detection
In NewLogPage.tsx, on phone field blur:
- Query Supabase for existing logs with same phone
- If found: show warning banner "Contact already exists — view their history"
- Offer to open existing contact instead of creating duplicate

---

## SPRINT 2 — Matching Dashboard (3-4 days)

Create new page: `src/pages/MatchingPage.tsx`
Add to sidebar navigation with lightning bolt icon.

Features:
- Two-column layout: Unmatched Farmers (selling) | Unmatched Buyers (buying)
- Per log: shows crop, quantity, region, timeframe, lead_temperature badge
- Click a log → see potential matches on the right panel
- "Connect" button: marks both as 'referred', logs the match, sends WhatsApp to both
- Crop filter at top: filter by crop to see supply/demand for one commodity
- Match count badge on sidebar icon (like followup badge)

Data source: Use existing findMatches() from matching.ts — it already works!
Just need the UI page.

---

## SPRINT 3 — Ambassador Module (3-5 days)

Create new page: `src/pages/AmbassadorsPage.tsx`

Features:
- Table of all ambassadors with: name, region, tier badge, referral count, transaction count
- Add/edit ambassador form
- Per ambassador: list of logs they referred (filter daily_logs by ambassador_id)
- Monthly performance summary: referrals this month vs target
- Tier upgrade logic: auto-suggest tier upgrade when thresholds met

---

## SPRINT 4 — Market Price Board (2-3 days)

Create new page: `src/pages/MarketPricesPage.tsx`

Features:
- CS agent logs daily prices: crop, region, market, low price, high price, unit
- Price history chart (last 30 days per crop)
- Export prices to formatted WhatsApp message (copy to clipboard)
- Latest prices visible on TodayPage as a widget

This feeds directly into the Evolution API WhatsApp broadcast system.

---

## SPRINT 5 — WhatsApp Integration (3-5 days)

Once Evolution API is running:

### Update FollowupsPage.tsx
The existing WhatsApp button likely opens a wa.me link.
Upgrade to: call Netlify Function → Evolution API → send message directly from app.

Create: `netlify/functions/send-whatsapp.ts`
```
POST body: { phone, message }
Calls Evolution API sendText endpoint
Logs sent message to followup_done_note
Returns success/failure
```

### Bulk WhatsApp Actions
On MatchingPage: after connecting farmer+buyer, auto-send intro message to both:
```
Hello [Name], AgriKonnect has found a match for your [crop].
A [buyer/farmer] in [region] is interested.
Our team will call you within 24 hours to facilitate the connection.
```

---

## SPRINT 6 — Mobile Optimization (2-3 days)

CS agent uses this on desktop but farmers/admins may access on mobile.
- Audit all pages at 375px viewport
- Fix Sidebar: convert to bottom navigation on mobile
- Fix tables: horizontal scroll or card view on mobile
- Fix forms: larger touch targets, better keyboard handling
- Test on actual Android phone (most common in Ghana)

---

## Priority Summary for PM

| Sprint | Est. Days | Impact | Start |
|--------|-----------|--------|-------|
| 1 — SQL Migration + Form Fields | 3-5 days | Critical | This week |
| 2 — Matching Dashboard | 3-4 days | Critical | Next week |
| 3 — Ambassador Module | 3-5 days | High | Week 3 |
| 4 — Market Price Board | 2-3 days | High | Week 4 |
| 5 — WhatsApp Integration | 3-5 days | High | Week 5-6 |
| 6 — Mobile Optimization | 2-3 days | Medium | Week 6 |

Total estimated: 16-25 development days across 6 weeks.
