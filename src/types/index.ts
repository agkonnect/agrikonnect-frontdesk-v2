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

export interface DailyLog {
  id: string
  created_at: string
  created_by: string

  contact_type: ContactType
  channel: Channel
  contact_name: string | null
  phone: string

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
  region: string
  district: string
  community: string
  gps_code: string
  intent: Intent
  crop: string
  quantity: string
  timeframe: Timeframe
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
  region: '',
  district: '',
  community: '',
  gps_code: '',
  intent: 'sell',
  crop: '',
  quantity: '',
  timeframe: 'unknown',
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
