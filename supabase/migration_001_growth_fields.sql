-- ============================================================
-- AgriKonnect Front Desk — Migration 001
-- Growth Engine Fields
-- Run in: Supabase Dashboard → SQL Editor
-- Date: March 2026
-- ============================================================

-- ----------------------------------------------------------------
-- ADD MISSING FIELDS TO DAILY_LOGS
-- ----------------------------------------------------------------

ALTER TABLE public.daily_logs

  -- WhatsApp contact (critical for Evolution API integration)
  ADD COLUMN IF NOT EXISTS whatsapp_number       text,

  -- Language preference (critical for Ghana market - Twi, Ga, Hausa etc)
  ADD COLUMN IF NOT EXISTS language_preference   text
    CHECK (language_preference IN ('english','twi','ga','hausa','dagbani','ewe','other'))
    DEFAULT 'english',

  -- Lead temperature (hot = ready now, warm = interested, cold = just browsing)
  ADD COLUMN IF NOT EXISTS lead_temperature      text
    CHECK (lead_temperature IN ('hot','warm','cold'))
    DEFAULT 'warm',

  -- Verification status (unverified → pending → verified)
  ADD COLUMN IF NOT EXISTS verification_status   text
    CHECK (verification_status IN ('unverified','pending','verified'))
    DEFAULT 'unverified',

  -- Ambassador tracking
  ADD COLUMN IF NOT EXISTS ambassador_id         text,
  ADD COLUMN IF NOT EXISTS referral_source_name  text,

  -- Pricing fields (standardized numeric for analytics)
  ADD COLUMN IF NOT EXISTS price_offered         numeric,
  ADD COLUMN IF NOT EXISTS price_unit            text
    CHECK (price_unit IN ('per_kg','per_bag_50kg','per_bag_100kg','per_crate','per_bunch','per_piece','other')),

  -- Payment preference (critical for MoMo integration)
  ADD COLUMN IF NOT EXISTS payment_method_pref   text
    CHECK (payment_method_pref IN ('mtn_momo','vodafone_cash','airteltigo_money','bank_transfer','cash','other')),

  -- Farm details (for farmers)
  ADD COLUMN IF NOT EXISTS farm_size_acres       numeric,
  ADD COLUMN IF NOT EXISTS harvest_date          date,

  -- Tracking
  ADD COLUMN IF NOT EXISTS last_interaction_at   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS interaction_count     integer NOT NULL DEFAULT 1;

-- ----------------------------------------------------------------
-- CREATE INDEXES FOR NEW FIELDS
-- ----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_daily_logs_verification
  ON public.daily_logs (verification_status);

CREATE INDEX IF NOT EXISTS idx_daily_logs_lead_temp
  ON public.daily_logs (lead_temperature);

CREATE INDEX IF NOT EXISTS idx_daily_logs_ambassador
  ON public.daily_logs (ambassador_id);

CREATE INDEX IF NOT EXISTS idx_daily_logs_whatsapp
  ON public.daily_logs (whatsapp_number);

-- ----------------------------------------------------------------
-- CREATE AMBASSADORS TABLE
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ambassadors (
  id               text        PRIMARY KEY DEFAULT 'AMB-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  full_name        text        NOT NULL,
  phone            text        NOT NULL,
  whatsapp_number  text,
  region           text        NOT NULL,
  district         text        NOT NULL,
  community        text,
  tier             text        NOT NULL CHECK (tier IN ('starter','active','star')) DEFAULT 'starter',
  is_active        boolean     NOT NULL DEFAULT true,
  referral_count   integer     NOT NULL DEFAULT 0,
  transaction_count integer    NOT NULL DEFAULT 0,
  monthly_target   integer     NOT NULL DEFAULT 10,
  payment_number   text,
  payment_method   text        CHECK (payment_method IN ('mtn_momo','vodafone_cash','airteltigo_money','cash')),
  joined_at        timestamptz NOT NULL DEFAULT now(),
  notes            text
);

COMMENT ON TABLE public.ambassadors IS 'Regional ambassadors who recruit farmers and buyers for AgriKonnect.';

-- RLS for ambassadors
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ambassadors: authenticated select all"
  ON public.ambassadors FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "ambassadors: admin all"
  ON public.ambassadors FOR ALL
  USING (public.is_admin());

-- ----------------------------------------------------------------
-- CREATE MARKET PRICES TABLE (for daily broadcasts)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.market_prices (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        REFERENCES public.profiles(id),
  crop         text        NOT NULL,
  region       text        NOT NULL,
  market_name  text,
  price_low    numeric     NOT NULL,
  price_high   numeric     NOT NULL,
  unit         text        NOT NULL DEFAULT 'per_bag_50kg',
  source       text        DEFAULT 'cs_agent',
  notes        text
);

COMMENT ON TABLE public.market_prices IS 'Daily market prices logged by CS agent for WhatsApp broadcasts.';

CREATE INDEX IF NOT EXISTS idx_market_prices_crop
  ON public.market_prices (crop, created_at DESC);

-- RLS for market_prices
ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_prices: authenticated select"
  ON public.market_prices FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "market_prices: authenticated insert"
  ON public.market_prices FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "market_prices: admin all"
  ON public.market_prices FOR ALL
  USING (public.is_admin());

-- ----------------------------------------------------------------
-- STANDARDIZE CROP NAMES (View for consistent matching)
-- ----------------------------------------------------------------

CREATE OR REPLACE VIEW public.crop_demand_summary AS
  SELECT
    lower(trim(crop)) AS crop_normalized,
    count(*) FILTER (WHERE contact_type = 'farmer' AND intent = 'sell') AS supply_count,
    count(*) FILTER (WHERE contact_type = 'buyer'  AND intent = 'buy')  AS demand_count,
    count(*) FILTER (WHERE contact_type = 'farmer' AND intent = 'sell' AND verification_status = 'verified') AS verified_supply,
    avg(price_offered) FILTER (WHERE price_offered IS NOT NULL) AS avg_price,
    max(created_at) AS last_activity
  FROM public.daily_logs
  WHERE crop IS NOT NULL AND crop != ''
  GROUP BY lower(trim(crop))
  ORDER BY supply_count + demand_count DESC;

COMMENT ON VIEW public.crop_demand_summary IS 'Live supply/demand summary per crop for matching and analytics.';

-- ----------------------------------------------------------------
-- FUNCTION: Get potential matches count for a log
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_match_count(log_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT count(*)::integer
  FROM public.daily_logs src
  JOIN public.daily_logs tgt ON (
    lower(trim(tgt.crop)) LIKE '%' || lower(trim(src.crop)) || '%'
    AND tgt.contact_type = CASE WHEN src.contact_type = 'farmer' THEN 'buyer' ELSE 'farmer' END
    AND tgt.intent       = CASE WHEN src.intent       = 'sell'   THEN 'buy'   ELSE 'sell' END
    AND tgt.outcome NOT IN ('resolved', 'not_qualified')
    AND tgt.id != src.id
  )
  WHERE src.id = log_id AND src.crop IS NOT NULL;
$$;
