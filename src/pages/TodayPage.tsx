import { useEffect, useState, useCallback } from 'react'
import { format, startOfDay, endOfDay, subDays, subHours, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useLogs } from '../hooks/useLogs'
import { matchInList } from '../lib/matching'
import LogDetailPanel from '../components/LogDetailPanel'
import ExportModal from '../components/ExportModal'
import type { DailyLogWithProfiles } from '../types'
import {
  CONTACT_TYPE_LABELS,
  CHANNEL_LABELS,
  INTENT_LABELS,
  OUTCOME_LABELS,
  FOLLOWUP_STATUS_LABELS,
  contactTypeBadge,
  outcomeBadge,
  followupBadge,
} from '../types'

interface Props { isAdmin: boolean }

type Preset = 'today' | 'yesterday' | 'last7' | 'custom'

interface KpiCardProps {
  label: string
  value: number
  valueColor?: string
  labelColor?: string
}

function KpiCard({ label, value, valueColor = '#fff', labelColor = 'var(--dim)' }: KpiCardProps) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 20px',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 700, color: valueColor, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 5, color: labelColor }}>
        {label}
      </div>
    </div>
  )
}

function topCrops(logs: DailyLogWithProfiles[]): { crop: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const log of logs) {
    if (!log.crop) continue
    const key = log.crop.trim()
    if (!key) continue
    const norm = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase()
    counts.set(norm, (counts.get(norm) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([crop, count]) => ({ crop, count }))
    .sort((a, b) => b.count - a.count)
}

function getRange(preset: Preset, customFrom: string, customTo: string): { start: Date; end: Date } {
  const today = new Date()
  if (preset === 'today')     return { start: subHours(today, 24), end: today }
  if (preset === 'yesterday') { const d = subDays(today, 1); return { start: startOfDay(d), end: endOfDay(d) } }
  if (preset === 'last7')     return { start: startOfDay(subDays(today, 6)), end: endOfDay(today) }
  const s = customFrom ? parseISO(customFrom) : today
  const e = customTo   ? parseISO(customTo)   : today
  return { start: startOfDay(s), end: endOfDay(e) }
}

function rangeLabel(preset: Preset, customFrom: string, customTo: string): string {
  if (preset === 'today')     return 'today'
  if (preset === 'yesterday') return 'yesterday'
  if (preset === 'last7')     return 'last 7 days'
  if (!customFrom && !customTo) return 'selected range'
  if (customFrom === customTo)  return format(parseISO(customFrom), 'MMM d, yyyy')
  const from = customFrom ? format(parseISO(customFrom), 'MMM d') : '?'
  const to   = customTo   ? format(parseISO(customTo),   'MMM d, yyyy') : '?'
  return `${from} – ${to}`
}

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today',     label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7',     label: 'Last 7 Days' },
  { key: 'custom',    label: 'Custom Range' },
]

export default function LogsPage({ isAdmin }: Props) {
  const { logs, stats, loading, error, fetchLogs, updateLog } = useLogs()
  const [selectedLog,   setSelectedLog]   = useState<DailyLogWithProfiles | null>(null)
  const [showExport,    setShowExport]    = useState(false)
  const [currentUserId, setCurrentUserId] = useState('')
  const [preset,        setPreset]        = useState<Preset>('today')
  const [customFrom,    setCustomFrom]    = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customTo,      setCustomTo]      = useState(format(new Date(), 'yyyy-MM-dd'))

  const load = useCallback(() => {
    const { start, end } = getRange(preset, customFrom, customTo)
    fetchLogs(start, end)
  }, [preset, customFrom, customTo, fetchLogs])

  useEffect(() => {
    load()
    supabase.auth.getUser().then(({ data: authData }) => setCurrentUserId(authData.user?.id ?? ''))
  }, [load])

  const crops = topCrops(logs)
  const label = rangeLabel(preset, customFrom, customTo)

  return (
    <div>
      {/* Date filter bar */}
      <div style={{ padding: '0 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                fontWeight: 600,
                fontFamily: 'inherit',
                borderRadius: 8,
                cursor: 'pointer',
                border: `1px solid ${preset === p.key ? 'var(--emerald)' : 'var(--border)'}`,
                background: preset === p.key ? 'rgba(16,185,129,.12)' : 'var(--surface)',
                color: preset === p.key ? 'var(--emerald)' : 'var(--muted)',
                transition: 'all .15s',
              }}
            >
              {p.label}
            </button>
          ))}

          {preset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
              <input
                type="date"
                value={customFrom}
                max={customTo || format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setCustomFrom(e.target.value)}
                style={{
                  padding: '5px 10px', fontSize: 12, fontFamily: 'inherit',
                  background: 'var(--surface)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--dim)' }}>→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => setCustomTo(e.target.value)}
                style={{
                  padding: '5px 10px', fontSize: 12, fontFamily: 'inherit',
                  background: 'var(--surface)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, padding: '0 28px', marginBottom: 20 }}>
        <KpiCard label="Total Logs"         value={stats.total}            />
        <KpiCard label="Farmers"            value={stats.farmers}          valueColor="#a3e635" labelColor="#84cc16" />
        <KpiCard label="Buyers"             value={stats.buyers}           valueColor="#60a5fa" labelColor="#3b82f6" />
        <KpiCard label="Pending Follow-ups" value={stats.pendingFollowups} valueColor="#fbbf24" labelColor="var(--amber)" />
      </div>

      {/* Top Crops panel */}
      {crops.length > 0 && (
        <div style={{ padding: '0 28px', marginBottom: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Top Crops</span>
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>— {label}</span>
            </div>
            <div style={{ padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {crops.map(({ crop, count }, i) => {
                const colors = [
                  { bg: 'rgba(251,191,36,.1)',   border: 'rgba(251,191,36,.25)',  text: '#fbbf24', dot: '#f59e0b' },
                  { bg: 'rgba(156,163,175,.08)', border: 'rgba(156,163,175,.2)', text: '#d1d5db', dot: '#9ca3af' },
                  { bg: 'rgba(180,120,80,.1)',   border: 'rgba(180,120,80,.25)', text: '#d97706', dot: '#b45309' },
                ]
                const c = colors[i] ?? { bg: 'rgba(113,113,122,.1)', border: 'rgba(113,113,122,.2)', text: 'var(--muted)', dot: 'var(--dim)' }
                return (
                  <div key={crop} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: c.bg, border: `1px solid ${c.border}`,
                    borderRadius: 8, padding: '7px 12px', minWidth: 0,
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{crop}</span>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: c.text, lineHeight: 1, marginLeft: 2 }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Table card */}
      <div style={{ padding: '0 28px', marginBottom: 20 }}>
        {error && (
          <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>
            {error}
          </div>
        )}

        <div className="card">
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Logs</span>
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>— {label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--dim)' }}>{logs.length} records</span>
              <button
                onClick={load}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--dim)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', transition: 'color .15s' }}
                onMouseOver={e => (e.currentTarget.style.color = 'var(--muted)')}
                onMouseOut={e => (e.currentTarget.style.color = 'var(--dim)')}
              >
                <svg className={loading ? 'animate-spin' : ''} width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
              <button
                onClick={() => setShowExport(true)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: 11, fontWeight: 600,
                  background: 'var(--surface2)', color: 'var(--muted)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .15s',
                }}
                onMouseOver={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
                onMouseOut={e =>  { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date / Time</th><th>Type</th><th>Channel</th><th>Phone</th>
                  <th>Region / District</th><th>Intent</th><th>Outcome</th>
                  <th>Follow-up</th><th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--dim)' }}>Loading…</td></tr>
                )}
                {!loading && logs.length === 0 && (
                  <tr><td colSpan={9} style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--faint)' }}>No logs found for {label}.</td></tr>
                )}
                {logs.map(log => {
                  const hasMatches = matchInList(log, logs).length > 0
                  return (
                    <tr key={log.id} onClick={() => setSelectedLog(log)}>
                      <td className="mono">{format(new Date(log.created_at), 'dd MMM, HH:mm')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span className={contactTypeBadge(log.contact_type)}>{CONTACT_TYPE_LABELS[log.contact_type]}</span>
                          {hasMatches && <span title="Potential match found" style={{ fontSize: 11, cursor: 'default' }}>⚡</span>}
                        </div>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{CHANNEL_LABELS[log.channel]}</td>
                      <td className="mono">{log.phone}</td>
                      <td>
                        <strong>{log.district}</strong>
                        <span className="sub">{log.region}</span>
                      </td>
                      <td>{INTENT_LABELS[log.intent]}</td>
                      <td><span className={outcomeBadge(log.outcome)}>{OUTCOME_LABELS[log.outcome]}</span></td>
                      <td><span className={followupBadge(log.followup_status)}>{FOLLOWUP_STATUS_LABELS[log.followup_status]}</span></td>
                      <td>{log.assignee?.full_name ?? <span style={{ color: 'var(--faint)' }}>—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedLog && (
        <LogDetailPanel
          log={selectedLog}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onClose={() => setSelectedLog(null)}
          onUpdate={async (id, updates) => {
            await updateLog(id, updates)
            setSelectedLog(prev => prev?.id === id ? { ...prev, ...updates } as DailyLogWithProfiles : prev)
          }}
        />
      )}

      {showExport && <ExportModal onClose={() => setShowExport(false)} />}
    </div>
  )
}
