import { supabase } from './supabase'
import type { DailyLog, DailyLogWithProfiles, ContactType, Intent } from '../types'

/** A log qualifies for matching if it has a crop + a buy/sell intent */
export function isMatchable(log: { contact_type: ContactType; intent: Intent; crop: string | null }) {
  return (
    log.crop != null &&
    log.crop.trim().length > 0 &&
    (
      (log.contact_type === 'farmer'  && log.intent === 'sell') ||
      (log.contact_type === 'buyer'   && log.intent === 'buy')
    )
  )
}

/**
 * Given a log's crop + intent, find opposite-side logs from Supabase.
 * Farmer selling → find Buyers buying same crop (and vice-versa).
 * Excludes resolved / not_qualified outcomes.
 */
export async function findMatches(
  crop: string,
  intent: 'sell' | 'buy',
  excludeId?: string
): Promise<DailyLog[]> {
  const oppositeType:   ContactType = intent === 'sell' ? 'buyer'  : 'farmer'
  const oppositeIntent: Intent      = intent === 'sell' ? 'buy'    : 'sell'

  let query = supabase
    .from('daily_logs')
    .select('*')
    .eq('contact_type', oppositeType)
    .eq('intent', oppositeIntent)
    .ilike('crop', `%${crop.trim()}%`)
    .not('outcome', 'in', '("resolved","not_qualified")')
    .order('created_at', { ascending: false })
    .limit(10)

  if (excludeId) {
    query = query.neq('id', excludeId)
  }

  const { data } = await query
  return (data ?? []) as unknown as DailyLog[]
}

/**
 * Find matches for a log purely from an already-fetched list (no extra query).
 * Used for the Today table lightning indicators.
 */
export function matchInList(
  log: DailyLogWithProfiles,
  allLogs: DailyLogWithProfiles[]
): DailyLogWithProfiles[] {
  if (!isMatchable(log)) return []

  const crop           = log.crop!.toLowerCase().trim()
  const oppositeType   = log.contact_type === 'farmer' ? 'buyer'  : 'farmer'
  const oppositeIntent = log.intent        === 'sell'   ? 'buy'    : 'sell'

  return allLogs.filter(l =>
    l.id !== log.id &&
    l.contact_type === oppositeType &&
    l.intent       === oppositeIntent &&
    l.crop         != null &&
    l.crop.toLowerCase().includes(crop) &&
    !['resolved', 'not_qualified'].includes(l.outcome)
  )
}
