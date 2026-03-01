import { useState, useCallback } from 'react'
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { DailyLog, DailyLogWithProfiles, Profile } from '../types'

interface TodayStats {
  total: number
  farmers: number
  buyers: number
  followupsDueToday: number
}

async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, created_at')
  if (error) console.error('[fetchProfiles] error:', error)
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


export function useLogs() {
  const [logs, setLogs] = useState<DailyLogWithProfiles[]>([])
  const [stats, setStats] = useState<TodayStats>({ total: 0, farmers: 0, buyers: 0, followupsDueToday: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTodayLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    const todayStart = startOfDay(new Date()).toISOString()
    const todayEnd   = endOfDay(new Date()).toISOString()

    const [logsResult, profiles] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('*')
        .gte('created_at', todayStart)
        .lte('created_at', todayEnd)
        .order('created_at', { ascending: false }),
      fetchProfiles(),
    ])

    if (logsResult.error) {
      const msg = logsResult.error.message
      console.error('[useLogs] Query error:', logsResult.error)
      setError(msg)
      toast.error(`Failed to load logs: ${msg}`)
      setLoading(false)
      return
    }

    const allLogs = (logsResult.data ?? []) as unknown as DailyLog[]
    const rows = withProfiles(allLogs, profiles)
    setLogs(rows)

    const total   = rows.length
    const farmers = rows.filter(r => r.contact_type === 'farmer').length
    const buyers  = rows.filter(r => r.contact_type === 'buyer').length

    const followupsDueToday = rows.filter(r =>
      r.followup_status === 'pending' &&
      r.followup_datetime != null &&
      isWithinInterval(new Date(r.followup_datetime), {
        start: startOfDay(new Date()),
        end: endOfDay(new Date()),
      })
    ).length

    setStats({ total, farmers, buyers, followupsDueToday })
    setLoading(false)
  }, [])

  const updateLog = useCallback(async (id: string, updates: { notes?: string; outcome?: string }) => {
    const { data, error: uErr } = await supabase
      .from('daily_logs')
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select('*')
      .single()

    if (uErr) throw uErr

    const profiles = await fetchProfiles()
    const updated = withProfiles([data as unknown as DailyLog], profiles)[0]
    setLogs(prev => prev.map(l => l.id === id ? updated : l))
    return updated
  }, [])

  return { logs, stats, loading, error, fetchTodayLogs, updateLog }
}
