-- ============================================================
-- AgriKonnect Front Desk — Supabase Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  full_name   text        not null,
  role        text        not null check (role in ('frontdesk', 'admin')),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'One row per Supabase auth user; links user identity to app role.';

-- ----------------------------------------------------------------
-- 2. DAILY LOGS
-- ----------------------------------------------------------------
create table if not exists public.daily_logs (
  id                  uuid        primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  created_by          uuid        not null references public.profiles(id),

  -- Contact info
  contact_type        text        not null check (contact_type in ('farmer','buyer','distributor','partner','inquiry')),
  channel             text        not null check (channel in ('walk-in','phone','whatsapp','tiktok','instagram','website','referral','other')),
  contact_name        text,
  phone               text        not null,

  -- Location
  region              text        not null,
  district            text        not null,
  community           text,
  gps_code            text,

  -- Intent / product
  intent              text        not null check (intent in ('sell','buy','distributor','logistics','pricing','support','other')),
  crop                text,
  quantity            text,
  timeframe           text        check (timeframe in ('now','1_week','1_month','unknown')) default 'unknown',

  -- Outcome
  outcome             text        not null check (outcome in ('resolved','referred','scheduled_callback','not_qualified','pending')),

  -- Follow-up
  followup_needed     boolean     not null default false,
  followup_datetime   timestamptz,
  assigned_to         uuid        references public.profiles(id),
  followup_status     text        not null check (followup_status in ('none','pending','done')) default 'none',
  followup_done_at    timestamptz,
  followup_done_note  text,

  -- Free text
  notes               text
);

comment on table public.daily_logs is 'One row per front-desk interaction logged by the team.';

-- ----------------------------------------------------------------
-- 3. INDEXES
-- ----------------------------------------------------------------
create index if not exists idx_daily_logs_created_at
  on public.daily_logs (created_at desc);

create index if not exists idx_daily_logs_followup
  on public.daily_logs (followup_status, followup_datetime);

create index if not exists idx_daily_logs_phone
  on public.daily_logs (phone);

-- ----------------------------------------------------------------
-- 4. HELPER FUNCTION — is_admin()
-- ----------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

-- ----------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ----------------------------------------------------------------

-- ---- profiles ----
alter table public.profiles enable row level security;

-- Authenticated users can read their own profile
create policy "profiles: own row select"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Admins can read all profiles (needed to populate assigned_to dropdown)
create policy "profiles: admin select all"
  on public.profiles
  for select
  using (public.is_admin());

-- No direct inserts via app; profiles are created by admin via dashboard/SQL.
-- (Service-role key can bypass RLS to insert profiles.)

-- Admins can update any profile (role, is_active, full_name)
create policy "profiles: admin update any"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

-- ---- daily_logs ----
alter table public.daily_logs enable row level security;

-- INSERT: authenticated users can only insert rows they own
create policy "daily_logs: authenticated insert"
  on public.daily_logs
  for insert
  with check (auth.uid() = created_by);

-- SELECT: any authenticated user can read all logs (internal team)
create policy "daily_logs: authenticated select all"
  on public.daily_logs
  for select
  using (auth.role() = 'authenticated');

-- STRICTER SELECT (commented out): uncomment and drop the above to restrict reads to admins only
-- create policy "daily_logs: admin select only"
--   on public.daily_logs
--   for select
--   using (public.is_admin());

-- UPDATE: creator can update their own rows; admins can update any row
create policy "daily_logs: own row or admin update"
  on public.daily_logs
  for update
  using (
    auth.uid() = created_by
    or public.is_admin()
  );

-- ----------------------------------------------------------------
-- 6. OPTIONAL SEED HELPER
-- Run after creating users in Supabase Auth dashboard:
--
--   insert into public.profiles (id, full_name, role)
--   values
--     ('<paste-auth-user-uuid-admin>',    'Admin User',     'admin'),
--     ('<paste-auth-user-uuid-frontdesk>','Front Desk User','frontdesk');
--
-- You can find auth user UUIDs in:
--   Supabase Dashboard → Authentication → Users
-- ----------------------------------------------------------------
