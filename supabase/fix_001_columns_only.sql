-- ============================================================
-- FIX 001: Add growth engine columns to daily_logs
-- Run this if the original migration failed partway through
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- Step 1: Add all new columns to daily_logs
ALTER TABLE public.daily_logs
  ADD COLUMN IF NOT EXISTS whatsapp_number       text,
  ADD COLUMN IF NOT EXISTS language_preference   text
    CHECK (language_preference IN ('english','twi','ga','hausa','dagbani','ewe')),
  ADD COLUMN IF NOT EXISTS lead_temperature      text
    CHECK (lead_temperature IN ('hot','warm','cold')),
  ADD COLUMN IF NOT EXISTS verification_status   text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected')),
  ADD COLUMN IF NOT EXISTS ambassador_id         text,
  ADD COLUMN IF NOT EXISTS referral_source_name  text,
  ADD COLUMN IF NOT EXISTS price_offered         numeric,
  ADD COLUMN IF NOT EXISTS price_unit            text
    CHECK (price_unit IN ('per_kg','per_bag','per_crate','per_unit','per_tonne')),
  ADD COLUMN IF NOT EXISTS payment_method_pref   text
    CHECK (payment_method_pref IN ('mtn_momo','vodafone_cash','airteltigo_money','bank_transfer','cash','other')),
  ADD COLUMN IF NOT EXISTS farm_size_acres       numeric,
  ADD COLUMN IF NOT EXISTS harvest_date          date,
  ADD COLUMN IF NOT EXISTS last_interaction_at   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS interaction_count     integer NOT NULL DEFAULT 1;

-- Step 2: Create ambassadors table
CREATE TABLE IF NOT EXISTS public.ambassadors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  full_name     text NOT NULL,
  phone         text NOT NULL,
  whatsapp      text,
  region        text NOT NULL,
  district      text,
  ambassador_code text UNIQUE,
  tier          text NOT NULL DEFAULT 'starter'
    CHECK (tier IN ('starter','active','star')),
  is_active     boolean NOT NULL DEFAULT true,
  total_referrals integer NOT NULL DEFAULT 0,
  notes         text
);

ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read ambassadors" ON public.ambassadors;
CREATE POLICY "Authenticated users can read ambassadors"
  ON public.ambassadors FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert ambassadors" ON public.ambassadors;
CREATE POLICY "Authenticated users can insert ambassadors"
  ON public.ambassadors FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update ambassadors" ON public.ambassadors;
CREATE POLICY "Authenticated users can update ambassadors"
  ON public.ambassadors FOR UPDATE
  TO authenticated USING (true);

-- Step 3: Create market_prices table
CREATE TABLE IF NOT EXISTS public.market_prices (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid REFERENCES public.profiles(id),
  crop        text NOT NULL,
  price       numeric NOT NULL,
  unit        text NOT NULL DEFAULT 'per_bag',
  market_name text,
  region      text,
  valid_date  date NOT NULL DEFAULT CURRENT_DATE,
  notes       text
);

ALTER TABLE public.market_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read market_prices" ON public.market_prices;
CREATE POLICY "Authenticated users can read market_prices"
  ON public.market_prices FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert market_prices" ON public.market_prices;
CREATE POLICY "Authenticated users can insert market_prices"
  ON public.market_prices FOR INSERT
  TO authenticated WITH CHECK (true);

-- Step 4: get_match_count function
CREATE OR REPLACE FUNCTION public.get_match_count(log_id uuid)
RETURNS integer
LANGUAGE sql STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.daily_logs l1
  JOIN public.daily_logs l2
    ON lower(trim(l1.crop)) = lower(trim(l2.crop))
   AND l1.intent != l2.intent
   AND l2.id != l1.id
  WHERE l1.id = log_id
    AND l1.crop IS NOT NULL;
$$;

