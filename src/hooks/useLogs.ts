import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { DailyLog, DailyLogWithProfiles, Profile } from '../types'

interface LogStats {
  total: number
  farmers: number
  buyers: number
  pendingFollowups: number
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
  const [stats, setStats] = useState<LogStats>({ total: 0, farmers: 0, buyers: 0, pendingFollowups: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLogs = useCallback(async (start: Date, end: Date) => {
    setLoading(true)
    setError(null)

    console.log('[AgriKonnect] Fetching logs:', {
      start: start.toISOString(),
      end: end.toISOString(),
      localStart: start.toString(),
      localEnd: end.toString(),
    })

    const [logsResult, profiles] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false }),
      fetchProfiles(),
    ])

    console.log('[AgriKonnect] Query result:', {
      error: logsResult.error,
      count: logsResult.data?.length ?? 0,
      data: logsResult.data,
    })

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

    const total            = rows.length
    const farmers          = rows.filter(r => r.contact_type === 'farmer').length
    const buyers           = rows.filter(r => r.contact_type === 'buyer').length
    const pendingFollowups = rows.filter(r => r.followup_status === 'pending').length

    setStats({ total, farmers, buyers, pendingFollowups })
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

  return { logs, stats, loading, error, fetchLogs, updateLog }
}
