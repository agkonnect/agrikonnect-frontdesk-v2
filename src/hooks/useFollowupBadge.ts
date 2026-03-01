import { useState, useEffect, useCallback } from 'react'
import { startOfDay, endOfDay } from 'date-fns'
import { supabase } from '../lib/supabase'

export interface FollowupBadge {
  overdue: number
  dueToday: number
}

const POLL_MS = 5 * 60 * 1000 // refresh every 5 minutes

export function useFollowupBadge() {
  const [badge, setBadge] = useState<FollowupBadge>({ overdue: 0, dueToday: 0 })

  const refresh = useCallback(async () => {
    const now = new Date()

    const [overdueRes, dueTodayRes] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('*', { count: 'exact', head: true })
        .eq('followup_status', 'pending')
        .lt('followup_datetime', startOfDay(now).toISOString()),

      supabase
        .from('daily_logs')
        .select('*', { count: 'exact', head: true })
        .eq('followup_status', 'pending')
        .gte('followup_datetime', startOfDay(now).toISOString())
        .lte('followup_datetime', endOfDay(now).toISOString()),
    ])

    setBadge({
      overdue:  overdueRes.count  ?? 0,
      dueToday: dueTodayRes.count ?? 0,
    })
  }, [])

  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, POLL_MS)
    return () => clearInterval(timer)
  }, [refresh])

  return { badge, refresh }
}
