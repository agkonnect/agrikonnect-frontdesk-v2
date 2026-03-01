import { useState, useCallback } from 'react'
import { startOfDay, endOfDay } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { DailyLog, DailyLogWithProfiles, Profile } from '../types'

export type FollowupTab = 'due_today' | 'overdue' | 'all_pending'

async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await supabase.from('profiles').select('id, full_name, role, is_active, created_at')
  return (data ?? []) as unknown as Profile[]
}

function withProfiles(logs: DailyLog[], profiles: Profile[]): DailyLogWithProfiles[] {
  const map = new Map(profiles.map(p => [p.id, p]))
  return logs.map(log => ({
    ...log,
    creator: map.get(log.created_by) ?? null,
    assignee: log.assigned_to ? (map.get(log.assigned_to) ?? null) : null,
  }))
}

export function useFollowups() {
  const [followups, setFollowups] = useState<DailyLogWithProfiles[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFollowups = useCallback(async (tab: FollowupTab) => {
    setLoading(true)
    setError(null)

    const now = new Date()

    let query = supabase
      .from('daily_logs')
      .select('*')
      .eq('followup_status', 'pending')
      .order('followup_datetime', { ascending: true })
      .limit(200)

    if (tab === 'due_today') {
      query = query
        .gte('followup_datetime', startOfDay(now).toISOString())
        .lte('followup_datetime', endOfDay(now).toISOString())
    } else if (tab === 'overdue') {
      query = query.lt('followup_datetime', now.toISOString())
    }

    const [logsResult, profiles] = await Promise.all([query, fetchProfiles()])

    if (logsResult.error) {
      setError(logsResult.error.message)
      setLoading(false)
      return
    }

    const rawLogs = (logsResult.data ?? []) as unknown as DailyLog[]
    setFollowups(withProfiles(rawLogs, profiles))
    setLoading(false)
  }, [])

  const markDone = useCallback(async (id: string, note: string) => {
    const { error: uErr } = await supabase
      .from('daily_logs')
      .update({
        followup_status: 'done',
        followup_done_at: new Date().toISOString(),
        followup_done_note: note || null,
      } as Record<string, unknown>)
      .eq('id', id)

    if (uErr) throw uErr

    setFollowups(prev => prev.filter(f => f.id !== id))
  }, [])

  return { followups, loading, error, fetchFollowups, markDone }
}
