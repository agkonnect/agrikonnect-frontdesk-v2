import { useState, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  format, startOfWeek, startOfMonth, endOfMonth,
  subMonths, eachDayOfInterval, endOfDay,
} from 'date-fns'
import { supabase } from '../lib/supabase'
import type { Channel, Outcome, Intent, Profile } from '../types'
import { CHANNEL_LABELS, OUTCOME_LABELS, INTENT_LABELS } from '../types'
import ExportModal from '../components/ExportModal'

// ── Types ───────────────────────────────────────────────────
type Filter = 'week' | 'month' | 'last_month'

interface LogRow {
  id: string
  created_at: string
  channel: Channel
  outcome: Outcome
  intent: Intent
  region: string
  district: string
  crop: string | null
  quantity: string | null
  followup_needed: boolean
  followup_status: string
  assigned_to: string | null
}

// ── Constants ───────────────────────────────────────────────
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'week',       label: 'This Week' },
  { key: 'month',      label: 'This Month' },
  { key: 'last_month', label: 'Last Month' },
]

const CH_COLOR: Record<string, string> = {
  'walk-in':  '#10b981',
  phone:      '#60a5fa',
  whatsapp:   '#a3e635',
  tiktok:     '#f472b6',
  instagram:  '#fb923c',
  website:    '#a78bfa',
  referral:   '#38bdf8',
  other:      '#71717a',
}

const OC_COLOR: Record<string, string> = {
  resolved:           '#34d399',
  pending:            '#fbbf24',
  referred:           '#38bdf8',
  scheduled_callback: '#a78bfa',
  not_qualified:      '#52525b',
}

function getRange(f: Filter): { start: Date; end: Date } {
  const now = new Date()
  if (f === 'week')  return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfDay(now) }
  if (f === 'month') return { start: startOfMonth(now), end: endOfDay(now) }
  const lm = subMonths(now, 1)
  return { start: startOfMonth(lm), end: endOfMonth(lm) }
}

// ── Small reusable UI components ────────────────────────────
function KpiCard({ label, value, sub, color, accent, icon }: {
  label: string; value: string | number; sub?: string
  color?: string; accent?: string; icon?: ReactNode
}) {
  return (
    <div className="card" style={{
      padding: '18px 20px',
      borderTop: `2px solid ${accent ?? 'var(--border)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)' }}>
          {label}
        </div>
        {icon && (
          <div style={{ color: accent ?? 'var(--dim)', opacity: 0.55, marginTop: -1 }}>
            {icon}
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 30, fontWeight: 700, color: color ?? accent ?? 'var(--text)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 7 }}>{sub}</div>}
    </div>
  )
}

function ChartCard({ title, children, style }: { title: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={style}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {title}
      </div>
      <div style={{ padding: '18px' }}>{children}</div>
    </div>
  )
}

function Skeleton({ height = 200 }: { height?: number }) {
  return (
    <div style={{
      height,
      background: 'linear-gradient(90deg,var(--surface2) 0%,rgba(63,63,70,.3) 50%,var(--surface2) 100%)',
      borderRadius: 8,
      animation: 'shimmer 1.5s ease-in-out infinite',
    }}>
      <style>{`@keyframes shimmer{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
    </div>
  )
}

function EmptyState({ height = 200, text }: { height?: number; text: string }) {
  return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: 12 }}>
      {text}
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────
export default function AnalyticsPage() {
  const [filter,      setFilter]      = useState<Filter>('month')
  const [logs,        setLogs]        = useState<LogRow[]>([])
  const [profiles,    setProfiles]    = useState<Profile[]>([])
  const [loading,     setLoading]     = useState(false)
  const [showExport,  setShowExport]  = useState(false)

  const range = useMemo(() => getRange(filter), [filter])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      supabase
        .from('daily_logs')
        .select('id, created_at, channel, outcome, intent, region, district, crop, quantity, followup_needed, followup_status, assigned_to')
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, full_name, role, is_active, created_at'),
    ]).then(([logsRes, profilesRes]) => {
      if (cancelled) return
      setLogs((logsRes.data ?? []) as unknown as LogRow[])
      setProfiles((profilesRes.data ?? []) as unknown as Profile[])
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [range])

  // ── Computed datasets ────────────────────────────────────
  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range],
  )

  const dailyData = useMemo(() => {
    const countMap = new Map<string, number>()
    for (const log of logs) {
      const k = format(new Date(log.created_at), 'yyyy-MM-dd')
      countMap.set(k, (countMap.get(k) ?? 0) + 1)
    }
    const labelFmt = days.length <= 7 ? 'EEE' : 'dd MMM'
    return days.map(d => ({
      label: format(d, labelFmt),
      count: countMap.get(format(d, 'yyyy-MM-dd')) ?? 0,
    }))
  }, [logs, days])

  const channelData = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of logs) map.set(log.channel, (map.get(log.channel) ?? 0) + 1)
    const max = Math.max(...[...map.values()], 1)
    return [...map.entries()]
      .map(([ch, count]) => ({
        ch,
        label: CHANNEL_LABELS[ch as Channel] ?? ch,
        count,
        pct: Math.round((count / max) * 100),
      }))
      .sort((a, b) => b.count - a.count)
  }, [logs])

  const outcomeData = useMemo(() => {
    const map = new Map<string, number>()
    for (const log of logs) map.set(log.outcome, (map.get(log.outcome) ?? 0) + 1)
    return [...map.entries()]
      .map(([o, count]) => ({
        o,
        label: OUTCOME_LABELS[o as Outcome] ?? o,
        count,
        color: OC_COLOR[o] ?? '#52525b',
      }))
      .sort((a, b) => b.count - a.count)
  }, [logs])

  const staffData = useMemo(() => {
    const map = new Map<string, { done: number; pending: number }>()
    for (const log of logs) {
      if (!log.followup_needed || !log.assigned_to) continue
      const cur = map.get(log.assigned_to) ?? { done: 0, pending: 0 }
      if (log.followup_status === 'done') cur.done++
      else if (log.followup_status === 'pending') cur.pending++
      map.set(log.assigned_to, cur)
    }
    const profileMap = new Map(profiles.map(p => [p.id, p.full_name]))
    return [...map.entries()]
      .map(([id, s]) => ({
        name:    profileMap.get(id) ?? 'Unknown',
        done:    s.done,
        pending: s.pending,
        total:   s.done + s.pending,
      }))
      .sort((a, b) => b.total - a.total)
  }, [logs, profiles])

  const regionData = useMemo(() => {
    // Group by "region||district" key
    const map = new Map<string, { region: string; district: string; count: number; intents: Map<string, number> }>()
    for (const log of logs) {
      const r = (log.region ?? '').trim()
      const d = (log.district ?? '').trim()
      if (!r && !d) continue
      const key = `${r}||${d}`
      const cur = map.get(key) ?? { region: r, district: d, count: 0, intents: new Map() }
      cur.count++
      cur.intents.set(log.intent, (cur.intents.get(log.intent) ?? 0) + 1)
      map.set(key, cur)
    }
    return [...map.values()]
      .map(({ region, district, count, intents }) => {
        // Pick the most-frequent intent
        let topIntent = ''
        let topCount = 0
        for (const [intent, n] of intents) {
          if (n > topCount) { topCount = n; topIntent = intent }
        }
        return { region, district, count, topIntent }
      })
      .sort((a, b) => b.count - a.count)
  }, [logs])

  const cropDemandData = useMemo(() => {
    type Entry = { displayName: string; count: number; quantities: string[]; latestDate: string }
    const map = new Map<string, Entry>()

    for (const log of logs) {
      // Only logs where someone wants to BUY a crop
      if (log.intent !== 'buy' || !log.crop?.trim()) continue
      const raw  = log.crop.trim()
      const key  = raw.toLowerCase()
      const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()

      if (!map.has(key)) map.set(key, { displayName: name, count: 0, quantities: [], latestDate: log.created_at })
      const cur = map.get(key)!
      cur.count++
      if (log.quantity?.trim()) cur.quantities.push(log.quantity.trim())
      if (log.created_at > cur.latestDate) cur.latestDate = log.created_at
    }

    return [...map.values()]
      .map(({ displayName, count, quantities, latestDate }) => {
        // Extract leading numbers (e.g. "50 bags" → 50) and sum them
        const nums = quantities
          .map(q => { const m = q.match(/^(\d+(?:[.,]\d+)?)/); return m ? parseFloat(m[1].replace(',', '.')) : null })
          .filter((n): n is number => n !== null)

        // Find most common unit string after the number
        const units = quantities
          .map(q => q.replace(/^\d+(?:[.,]\d+)?\s*/, '').trim())
          .filter(Boolean)
        const unitFreq = new Map<string, number>()
        for (const u of units) unitFreq.set(u, (unitFreq.get(u) ?? 0) + 1)
        const topUnit = [...unitFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''

        let qtyDisplay: string
        if (nums.length > 0) {
          const total = nums.reduce((a, b) => a + b, 0)
          qtyDisplay = `${total % 1 === 0 ? total : total.toFixed(1)}${topUnit ? ` ${topUnit}` : ''}`
        } else if (quantities.length > 0) {
          // Quantities exist but aren't parseable numbers — show raw (first 2)
          qtyDisplay = quantities.slice(0, 2).join(' · ') + (quantities.length > 2 ? '…' : '')
        } else {
          qtyDisplay = '—'
        }

        return { displayName, count, qtyDisplay, latestDate }
      })
      .sort((a, b) => b.count - a.count)
  }, [logs])

  // ── KPI summary values ───────────────────────────────────
  const totalLogs   = logs.length
  const avgPerDay   = days.length > 0 ? (totalLogs / days.length).toFixed(1) : '0'
  const topChannel  = channelData[0]?.label ?? '—'
  const resolvedPct = totalLogs > 0
    ? `${Math.round((logs.filter(l => l.outcome === 'resolved').length / totalLogs) * 100)}%`
    : '—'

  // X-axis tick interval for the bar chart (prevent crowding)
  const xInterval = days.length <= 7 ? 0 : days.length <= 14 ? 1 : Math.floor(days.length / 10)

  // Shared axis/grid style
  const axisTick = { fill: '#71717a', fontSize: 10, fontFamily: 'DM Sans, sans-serif' }

  return (
    <div style={{ padding: '0 28px' }}>

      {/* ── Filter tabs + Export button ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', gap: 4,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 9, padding: 4,
        }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '6px 16px', borderRadius: 6,
                fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                border: 'none', transition: 'all .15s',
                background: filter === f.key ? 'var(--em-dim)' : 'transparent',
                color:      filter === f.key ? 'var(--em-light)' : 'var(--dim)',
                boxShadow:  filter === f.key ? '0 0 0 1px var(--em-border)' : 'none',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowExport(true)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600,
            background: 'var(--surface)', color: 'var(--muted)',
            border: '1px solid var(--border)', borderRadius: 8,
            padding: '7px 14px', cursor: 'pointer', fontFamily: 'inherit',
            transition: 'all .15s',
          }}
          onMouseOver={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
          onMouseOut={e =>  { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* ── Row 1: KPI cards with accent borders + icons ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 14 }}>
        <KpiCard
          label="Total Logs" value={loading ? '…' : totalLogs}
          sub={`over ${days.length} day${days.length !== 1 ? 's' : ''}`}
          accent="#10b981"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <KpiCard
          label="Avg per Day" value={loading ? '…' : avgPerDay}
          sub="logs per day"
          color="var(--em-light)" accent="#10b981"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <KpiCard
          label="Top Channel" value={loading ? '…' : topChannel}
          sub="most contacts via"
          color="#60a5fa" accent="#60a5fa"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>}
        />
        <KpiCard
          label="Resolved" value={loading ? '…' : resolvedPct}
          sub="of all outcomes"
          color="#34d399" accent="#34d399"
          icon={<svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* ── Row 2: Daily Logs — full width ── */}
      <ChartCard title="Logs per Day" style={{ marginBottom: 14 }}>
        {loading ? <Skeleton height={260} /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyData} barCategoryGap="38%">
              <CartesianGrid vertical={false} stroke="rgba(63,63,70,.4)" />
              <XAxis
                dataKey="label"
                tick={axisTick}
                axisLine={false} tickLine={false}
                interval={xInterval}
              />
              <YAxis
                allowDecimals={false}
                tick={axisTick}
                axisLine={false} tickLine={false}
                width={28}
              />
              <Tooltip
                cursor={{ fill: 'rgba(16,185,129,.06)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const v = payload[0].value as number
                  return (
                    <div style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                      <div style={{ color: '#a1a1aa', marginBottom: 3 }}>{label}</div>
                      <div style={{ color: '#f4f4f5', fontWeight: 700 }}>{v} log{v !== 1 ? 's' : ''}</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Row 3: Channel | Outcomes | Staff — 3 equal columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14, alignItems: 'start' }}>

        {/* Channel Breakdown */}
        <ChartCard title="Channel Breakdown">
          {loading
            ? <Skeleton height={240} />
            : channelData.length === 0
              ? <EmptyState height={240} text="No data for this period" />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 2 }}>
                  {channelData.map(({ ch, label, count, pct }) => (
                    <div key={ch}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: CH_COLOR[ch] ?? '#71717a', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>{label}</span>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: CH_COLOR[ch] ?? '#71717a',
                          borderRadius: 99, transition: 'width .6s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
          }
        </ChartCard>

        {/* Outcomes Donut */}
        <ChartCard title="Outcome Breakdown">
          {loading
            ? <Skeleton height={240} />
            : outcomeData.length === 0
              ? <EmptyState height={240} text="No data for this period" />
              : (
                <div>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={outcomeData}
                        dataKey="count"
                        nameKey="label"
                        cx="50%" cy="50%"
                        innerRadius={46} outerRadius={72}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {outcomeData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload as typeof outcomeData[0]
                          const pct = totalLogs > 0 ? Math.round((d.count / totalLogs) * 100) : 0
                          return (
                            <div style={{ background: '#27272a', border: '1px solid #3f3f46', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                              <div style={{ color: d.color, fontWeight: 700, marginBottom: 2 }}>{d.label}</div>
                              <div style={{ color: '#a1a1aa' }}>{d.count} · {pct}%</div>
                            </div>
                          )
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {outcomeData.map(d => {
                      const pct = totalLogs > 0 ? Math.round((d.count / totalLogs) * 100) : 0
                      return (
                        <div key={d.o} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 11, color: 'var(--muted)', flex: 1 }}>{d.label}</span>
                          <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'JetBrains Mono, monospace' }}>{d.count} · {pct}%</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
          }
        </ChartCard>

        {/* Staff Follow-ups — compact list style */}
        <ChartCard title="Staff Follow-ups">
          {loading
            ? <Skeleton height={240} />
            : staffData.length === 0
              ? <EmptyState height={240} text="No follow-up assignments in this period" />
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 2 }}>
                  {staffData.map(s => {
                    const donePct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0
                    return (
                      <div key={s.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>{s.name}</span>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>{s.done}✓</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24', fontFamily: 'JetBrains Mono, monospace' }}>{s.pending}⏳</span>
                          </div>
                        </div>
                        <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${donePct}%`,
                            background: '#34d399', borderRadius: 99,
                            transition: 'width .6s ease',
                          }} />
                        </div>
                        <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>{donePct}% complete</div>
                      </div>
                    )
                  })}
                </div>
              )
          }
        </ChartCard>
      </div>

      {/* ── Row 4: Crop Demand + Regional Activity — side by side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 40, alignItems: 'start' }}>

      {/* Crop Demand */}
      <div className="card">
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Crop Demand</span>
            <span style={{ fontSize: 11, color: 'var(--dim)', marginLeft: 8 }}>— what buyers are looking for</span>
          </div>
          {!loading && cropDemandData.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--dim)' }}>{cropDemandData.length} crop{cropDemandData.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 18 }}><Skeleton height={160} /></div>
        ) : cropDemandData.length === 0 ? (
          <EmptyState height={120} text="No buy requests with crop data in this period" />
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Crop</th>
                  <th style={{ textAlign: 'right' }}>Buy Requests</th>
                  <th>Total Qty Requested</th>
                  <th>Last Requested</th>
                  <th style={{ width: 160 }}>Demand</th>
                </tr>
              </thead>
              <tbody>
                {cropDemandData.map((row, i) => {
                  const maxCount = cropDemandData[0].count
                  const barPct   = maxCount > 0 ? Math.round((row.count / maxCount) * 100) : 0
                  // Rank colours: gold → silver → bronze → neutral
                  const rankColors = ['#fbbf24', '#d1d5db', '#d97706']
                  const rankColor  = rankColors[i] ?? 'var(--dim)'

                  return (
                    <tr key={row.displayName} style={{ cursor: 'default' }}>
                      <td>
                        <span style={{
                          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                          fontWeight: 700, color: rankColor,
                        }}>{i + 1}</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: 13 }}>{row.displayName}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>
                          {row.count}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: row.qtyDisplay === '—' ? 'var(--faint)' : 'var(--muted)' }}>
                          {row.qtyDisplay}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>
                        {format(new Date(row.latestDate), 'dd MMM yyyy')}
                      </td>
                      <td>
                        <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${barPct}%`,
                            background: 'linear-gradient(90deg, #60a5fa, #818cf8)',
                            borderRadius: 99, transition: 'width .6s ease',
                          }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Regional Activity */}
      <div className="card">
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Regional Activity</span>
          {!loading && regionData.length > 0 && (
            <span style={{ fontSize: 11, color: 'var(--dim)' }}>
              {regionData.length} region{regionData.length !== 1 ? 's' : ''} / district{regionData.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 18 }}><Skeleton height={160} /></div>
        ) : regionData.length === 0 ? (
          <EmptyState height={120} text="No location data for this period" />
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: 360, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Region</th>
                  <th>District</th>
                  <th style={{ textAlign: 'right' }}>Contacts</th>
                  <th>Most Common Intent</th>
                  <th style={{ width: 180 }}>Activity</th>
                </tr>
              </thead>
              <tbody>
                {regionData.map((row, i) => {
                  const maxCount = regionData[0].count
                  const barPct   = maxCount > 0 ? Math.round((row.count / maxCount) * 100) : 0
                  const intentLabel = INTENT_LABELS[row.topIntent as Intent] ?? row.topIntent

                  // Colour-code the intent badge inline
                  const intentColors: Record<string, { bg: string; color: string; border: string }> = {
                    sell:        { bg: 'rgba(132,204,22,.1)',  color: '#a3e635', border: 'rgba(132,204,22,.2)' },
                    buy:         { bg: 'rgba(59,130,246,.1)',  color: '#60a5fa', border: 'rgba(59,130,246,.2)' },
                    distributor: { bg: 'rgba(249,115,22,.1)',  color: '#fb923c', border: 'rgba(249,115,22,.2)' },
                    logistics:   { bg: 'rgba(139,92,246,.1)',  color: '#a78bfa', border: 'rgba(139,92,246,.2)' },
                    pricing:     { bg: 'rgba(251,191,36,.1)',  color: '#fbbf24', border: 'rgba(251,191,36,.2)' },
                    support:     { bg: 'rgba(14,165,233,.1)',  color: '#38bdf8', border: 'rgba(14,165,233,.2)' },
                    other:       { bg: 'rgba(113,113,122,.15)', color: 'var(--muted)', border: 'var(--faint)' },
                  }
                  const ic = intentColors[row.topIntent] ?? intentColors.other

                  return (
                    <tr key={`${row.region}||${row.district}`} style={{ cursor: 'default' }}>
                      <td className="mono" style={{ color: 'var(--dim)' }}>{i + 1}</td>
                      <td><strong>{row.region || '—'}</strong></td>
                      <td style={{ color: 'var(--muted)' }}>{row.district || '—'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                          {row.count}
                        </span>
                      </td>
                      <td>
                        {row.topIntent ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            fontSize: 9, fontWeight: 700,
                            textTransform: 'uppercase', letterSpacing: '.08em',
                            padding: '2px 7px', borderRadius: 4,
                            background: ic.bg, color: ic.color,
                            border: `1px solid ${ic.border}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {intentLabel}
                          </span>
                        ) : <span style={{ color: 'var(--faint)' }}>—</span>}
                      </td>
                      <td>
                        <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${barPct}%`,
                            background: 'var(--emerald)',
                            borderRadius: 99, transition: 'width .6s ease',
                          }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </div> {/* end 2-col grid */}

      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          defaultStart={format(range.start, 'yyyy-MM-dd')}
          defaultEnd={format(range.end > new Date() ? new Date() : range.end, 'yyyy-MM-dd')}
        />
      )}
    </div>
  )
}
