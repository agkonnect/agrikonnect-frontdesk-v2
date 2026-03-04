// -------------------------------------------------------
// Supabase Database type definition (used by typed client)
// -------------------------------------------------------
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      daily_logs: {
        Row: DailyLog
        Insert: Omit<DailyLog, 'id' | 'created_at'>
        Update: Partial<Omit<DailyLog, 'id' | 'created_at' | 'created_by'>>
      }
    }
    Views: Record<string, never>
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
    }
    Enums: Record<string, never>
  }
}

// -------------------------------------------------------
// Domain types
// -------------------------------------------------------

export interface Profile {
  id: string
  full_name: string
  role: 'frontdesk' | 'admin'
  is_active: boolean
  created_at: string
}

export type ContactType = 'farmer' | 'buyer' | 'distributor' | 'partner' | 'inquiry'
export type Channel = 'walk-in' | 'phone' | 'whatsapp' | 'tiktok' | 'instagram' | 'website' | 'referral' | 'other'
export type Intent = 'sell' | 'buy' | 'distributor' | 'logistics' | 'pricing' | 'support' | 'other'
export type Timeframe = 'now' | '1_week' | '1_month' | 'unknown'
export type Outcome = 'resolved' | 'referred' | 'scheduled_callback' | 'not_qualified' | 'pending'
export type FollowupStatus = 'none' | 'pending' | 'done'
export type LeadTemperature = 'hot' | 'warm' | 'cold'
export type LanguagePreference = 'english' | 'twi' | 'ga' | 'hausa' | 'dagbani' | 'ewe' | 'other'
export type VerificationStatus = 'unverified' | 'pending' | 'verified'
export type PaymentMethodPref = 'mtn_momo' | 'vodafone_cash' | 'airteltigo_money' | 'bank_transfer' | 'cash' | 'other'

export interface DailyLog {
  id: string
  created_at: string
  created_by: string

  contact_type: ContactType
  channel: Channel
  contact_name: string | null
  phone: string

  // Growth engine fields
  whatsapp_number: string | null
  language_preference: LanguagePreference | null
  lead_temperature: LeadTemperature | null
  verification_status: VerificationStatus | null
  ambassador_id: string | null
  referral_source_name: string | null
  price_offered: number | null
  price_unit: string | null
  payment_method_pref: PaymentMethodPref | null
  farm_size_acres: number | null

  region: string
  district: string
  community: string | null
  gps_code: string | null

  intent: Intent
  crop: string | null
  quantity: string | null
  timeframe: Timeframe | null

  outcome: Outcome

  followup_needed: boolean
  followup_datetime: string | null
  assigned_to: string | null
  followup_status: FollowupStatus
  followup_done_at: string | null
  followup_done_note: string | null

  notes: string | null
}

/** DailyLog joined with profile data for display */
export interface DailyLogWithProfiles extends DailyLog {
  creator: Pick<Profile, 'id' | 'full_name'> | null
  assignee: Pick<Profile, 'id' | 'full_name'> | null
}

// -------------------------------------------------------
// Form types
// -------------------------------------------------------

export interface NewLogFormValues {
  contact_type: ContactType
  channel: Channel
  contact_name: string
  phone: string
  whatsapp_number: string
  language_preference: LanguagePreference
  lead_temperature: LeadTemperature
  ambassador_id: string
  referral_source_name: string
  region: string
  district: string
  community: string
  gps_code: string
  intent: Intent
  crop: string
  quantity: string
  timeframe: Timeframe
  price_offered: string
  price_unit: string
  payment_method_pref: PaymentMethodPref | ''
  farm_size_acres: string
  outcome: Outcome
  followup_needed: boolean
  followup_datetime: string
  assigned_to: string
  notes: string
}

export const DEFAULT_FORM_VALUES: NewLogFormValues = {
  contact_type: 'farmer',
  channel: 'walk-in',
  contact_name: '',
  phone: '',
  whatsapp_number: '',
  language_preference: 'english',
  lead_temperature: 'warm',
  ambassador_id: '',
  referral_source_name: '',
  region: '',
  district: '',
  community: '',
  gps_code: '',
  intent: 'sell',
  crop: '',
  quantity: '',
  timeframe: 'unknown',
  price_offered: '',
  price_unit: 'per_bag_50kg',
  payment_method_pref: '',
  farm_size_acres: '',
  outcome: 'pending',
  followup_needed: false,
  followup_datetime: '',
  assigned_to: '',
  notes: '',
}

// -------------------------------------------------------
// Option label helpers
// -------------------------------------------------------

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  farmer: 'Farmer',
  buyer: 'Buyer',
  distributor: 'Distributor',
  partner: 'Partner',
  inquiry: 'General Inquiry',
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  'walk-in': 'Walk-in',
  phone: 'Phone Call',
  whatsapp: 'WhatsApp',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  website: 'Website',
  referral: 'Referral',
  other: 'Other',
}

export const INTENT_LABELS: Record<Intent, string> = {
  sell: 'Sell Produce',
  buy: 'Buy Produce',
  distributor: 'Become Distributor',
  logistics: 'Logistics',
  pricing: 'Pricing Inquiry',
  support: 'Support',
  other: 'Other',
}

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  now: 'Immediately',
  '1_week': 'Within 1 Week',
  '1_month': 'Within 1 Month',
  unknown: 'Unknown',
}

export const OUTCOME_LABELS: Record<Outcome, string> = {
  resolved: 'Resolved',
  referred: 'Referred',
  scheduled_callback: 'Scheduled Callback',
  not_qualified: 'Not Qualified',
  pending: 'Pending',
}

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  none: 'None',
  pending: 'Pending',
  done: 'Done',
}

export const LANGUAGE_LABELS: Record<LanguagePreference, string> = {
  english: 'English',
  twi: 'Twi',
  ga: 'Ga',
  hausa: 'Hausa',
  dagbani: 'Dagbani',
  ewe: 'Ewe',
  other: 'Other',
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  pending: 'Pending Verification',
  verified: 'Verified',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodPref, string> = {
  mtn_momo: 'MTN MoMo',
  vodafone_cash: 'Vodafone Cash',
  airteltigo_money: 'AirtelTigo Money',
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  other: 'Other',
}

export const PRICE_UNIT_LABELS: Record<string, string> = {
  per_kg: 'per kg',
  per_bag_50kg: 'per 50kg bag',
  per_bag_100kg: 'per 100kg bag',
  per_crate: 'per crate',
  per_bunch: 'per bunch',
  per_piece: 'per piece',
  other: 'other unit',
}

// ── Badge CSS class helpers ──────────────────────────────

export function contactTypeBadge(t: ContactType): string {
  const map: Record<ContactType, string> = {
    farmer:      'badge badge-farmer',
    buyer:       'badge badge-buyer',
    distributor: 'badge badge-distributor',
    partner:     'badge badge-partner',
    inquiry:     'badge badge-inquiry',
  }
  return map[t] ?? 'badge badge-inquiry'
}

export function outcomeBadge(o: Outcome): string {
  const map: Record<Outcome, string> = {
    resolved:           'badge badge-resolved',
    referred:           'badge badge-referred',
    scheduled_callback: 'badge badge-scheduled',
    not_qualified:      'badge badge-not-qualified',
    pending:            'badge badge-pending-outcome',
  }
  return map[o] ?? 'badge badge-inquiry'
}

export function followupBadge(s: FollowupStatus): string {
  const map: Record<FollowupStatus, string> = {
    none:    'badge badge-fu-none',
    pending: 'badge badge-fu-pending',
    done:    'badge badge-fu-done',
  }
  return map[s] ?? 'badge badge-fu-none'
}

export function verificationBadge(s: VerificationStatus): string {
  const map: Record<VerificationStatus, string> = {
    unverified: 'badge badge-not-qualified',
    pending:    'badge badge-scheduled',
    verified:   'badge badge-resolved',
  }
  return map[s] ?? 'badge badge-inquiry'
}

export function leadTempColor(t: LeadTemperature | null): string {
  if (t === 'hot')  return '#ef4444'
  if (t === 'warm') return '#f59e0b'
  if (t === 'cold') return '#60a5fa'
  return 'var(--dim)'
}


// -------------------------------------------------------
// Ambassador types
// -------------------------------------------------------

export type AmbassadorType = 'field' | 'digital'
export type AmbassadorStatus = 'active' | 'inactive'
export type AmbassadorTier = 1 | 2 | 3

export interface Ambassador {
  id: string
  created_at: string
  name: string
  phone: string
  region: string
  type: AmbassadorType
  tier: AmbassadorTier
  status: AmbassadorStatus
  notes?: string
}
