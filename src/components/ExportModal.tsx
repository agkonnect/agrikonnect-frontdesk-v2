import { useState, useEffect } from 'react'
import { format, startOfMonth } from 'date-fns'
import { supabase } from '../lib/supabase'
import type { DailyLog, Profile } from '../types'
import {
  CONTACT_TYPE_LABELS, CHANNEL_LABELS, INTENT_LABELS,
  TIMEFRAME_LABELS, OUTCOME_LABELS,
} from '../types'

// ── CSV helpers ──────────────────────────────────────────────
function esc(val: string | number | boolean | null | undefined): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  // Wrap in quotes if it contains a comma, quote, or newline
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

const HEADERS = [
  'ID', 'Date', 'Time', 'Logged By',
  'Contact Type', 'Channel', 'Contact Name', 'Phone',
  'Region', 'District', 'Community', 'GPS Code',
  'Intent', 'Crop', 'Quantity', 'Timeframe',
  'Outcome', 'Notes',
  'Follow-up Needed', 'Follow-up Date/Time', 'Assigned To',
  'Follow-up Status', 'Follow-up Done At', 'Follow-up Note',
]

function buildFilename(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  if (
    s.getFullYear() === e.getFullYear() &&
    s.getMonth()    === e.getMonth()
  ) {
    return `agrikonnect-logs-${format(s, 'MMMM-yyyy').toLowerCase()}.csv`
  }
  return `agrikonnect-logs-${format(s, 'yyyy-MM-dd')}-to-${format(e, 'yyyy-MM-dd')}.csv`
}

function downloadCSV(content: string, filename: string) {
  // BOM (\uFEFF) so Excel opens UTF-8 correctly
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Component ────────────────────────────────────────────────
interface Props {
  onClose: () => void
  defaultStart?: string   // 'yyyy-MM-dd'
  defaultEnd?: string     // 'yyyy-MM-dd'
}

export default function ExportModal({ onClose, defaultStart, defaultEnd }: Props) {
  const today          = format(new Date(), 'yyyy-MM-dd')
  const firstOfMonth   = format(startOfMonth(new Date()), 'yyyy-MM-dd')

  const [startDate, setStartDate] = useState(defaultStart ?? firstOfMonth)
  const [endDate,   setEndDate]   = useState(defaultEnd   ?? today)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [count,     setCount]     = useState<number | null>(null)

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Live record count preview
  useEffect(() => {
    setCount(null)
    if (!startDate || !endDate) return
    const s = new Date(startDate)
    const e = new Date(endDate + 'T23:59:59')
    if (s > e) return

    supabase
      .from('daily_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', s.toISOString())
      .lte('created_at', e.toISOString())
      .then(({ count: c }) => setCount(c ?? 0))
  }, [startDate, endDate])

  const handleDownload = async () => {
    if (!startDate || !endDate) { setError('Please select both dates.'); return }
    const start = new Date(startDate)
    const end   = new Date(endDate + 'T23:59:59')
    if (start > end) { setError('Start date must be before end date.'); return }
    if (count === 0)  { setError('No logs found in this date range.'); return }

    setLoading(true)
    setError('')

    const [logsRes, profilesRes] = await Promise.all([
      supabase
        .from('daily_logs')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name'),
    ])

    if (logsRes.error) {
      setError(logsRes.error.message)
      setLoading(false)
      return
    }

    const logs       = (logsRes.data    ?? []) as unknown as DailyLog[]
    const profiles   = (profilesRes.data ?? []) as unknown as Profile[]
    const profileMap = new Map(profiles.map(p => [p.id, p.full_name]))

    const rows: string[] = [HEADERS.join(',')]

    for (const log of logs) {
      const row = [
        log.id,
        format(new Date(log.created_at), 'dd/MM/yyyy'),
        format(new Date(log.created_at), 'HH:mm'),
        profileMap.get(log.created_by)  ?? log.created_by,
        CONTACT_TYPE_LABELS[log.contact_type] ?? log.contact_type,
        CHANNEL_LABELS[log.channel]           ?? log.channel,
        log.contact_name,
        log.phone,
        log.region,
        log.district,
        log.community,
        log.gps_code,
        INTENT_LABELS[log.intent]             ?? log.intent,
        log.crop,
        log.quantity,
        log.timeframe ? (TIMEFRAME_LABELS[log.timeframe] ?? log.timeframe) : '',
        OUTCOME_LABELS[log.outcome]           ?? log.outcome,
        log.notes,
        log.followup_needed ? 'Yes' : 'No',
        log.followup_datetime
          ? format(new Date(log.followup_datetime), 'dd/MM/yyyy HH:mm')
          : '',
        log.assigned_to ? (profileMap.get(log.assigned_to) ?? log.assigned_to) : '',
        log.followup_status,
        log.followup_done_at
          ? format(new Date(log.followup_done_at), 'dd/MM/yyyy HH:mm')
          : '',
        log.followup_done_note,
      ].map(esc)

      rows.push(row.join(','))
    }

    downloadCSV(rows.join('\n'), buildFilename(startDate, endDate))
    setLoading(false)
    onClose()
  }

  const isValid = startDate && endDate && new Date(startDate) <= new Date(endDate)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(9,9,11,.65)', backdropFilter: 'blur(3px)' }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 420,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        boxShadow: '0 24px 60px rgba(0,0,0,.65)',
        zIndex: 401,
        animation: 'popIn .18s ease-out',
      }}>
        <style>{`
          @keyframes popIn { from{transform:translate(-50%,-50%) scale(.95);opacity:0} to{transform:translate(-50%,-50%) scale(1);opacity:1} }
          @keyframes spin   { to { transform: rotate(360deg) } }
        `}</style>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff' }}>
              Export Logs
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>
              Downloads a .csv file — opens in Excel or Google Sheets
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseOut={e =>  { e.currentTarget.style.background = 'transparent';     e.currentTarget.style.color = 'var(--dim)'  }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>

          {/* Date inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="form-label">Start Date</label>
              <input
                className="form-input"
                type="date"
                value={startDate}
                max={today}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                className="form-input"
                type="date"
                value={endDate}
                max={today}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Record count preview */}
          <div style={{
            marginBottom: 16,
            padding: '10px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 40,
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: 'var(--dim)', flexShrink: 0 }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {!isValid
              ? <span style={{ color: 'var(--dim)' }}>Select a valid date range above</span>
              : count === null
                ? <span style={{ color: 'var(--dim)' }}>Counting records…</span>
                : count === 0
                  ? <span style={{ color: '#f87171' }}>No logs found in this date range</span>
                  : <>
                      <strong style={{ color: 'var(--text)' }}>{count.toLocaleString()} log{count !== 1 ? 's' : ''}</strong>
                      <span style={{ color: 'var(--dim)' }}>will be included · {HEADERS.length} columns</span>
                    </>
            }
          </div>

          {/* Filename preview */}
          {isValid && (
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} style={{ color: 'var(--dim)', flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)' }}>
                {buildFilename(startDate, endDate)}
              </span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 12, padding: '9px 13px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleDownload}
              disabled={loading || !isValid || count === 0}
            >
              {loading ? (
                <>
                  <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                  Exporting…
                </>
              ) : (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
