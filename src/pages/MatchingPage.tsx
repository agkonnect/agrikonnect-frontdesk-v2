
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { matchInList } from '../lib/matching'
import type { DailyLogWithProfiles } from '../types'
import { TIMEFRAME_LABELS } from '../types'
import toast from 'react-hot-toast'

type MatchLog = DailyLogWithProfiles

function CropBadge({ crop }: { crop: string }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,.12)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,.2)', textTransform: 'capitalize' }}>
      {crop}
    </span>
  )
}

function MatchCount({ count }: { count: number }) {
  if (count === 0) return <span style={{ fontSize: 10, color: 'var(--dim)' }}>No matches</span>
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: 'rgba(251,191,36,.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,.25)' }}>
      {String.fromCodePoint(0x26A1)} {count} match{count !== 1 ? 'es' : ''}
    </span>
  )
}

function LogCard({
  log, matches, isSelected, onClick, onConnect,
}: {
  log: MatchLog
  matches: MatchLog[]
  isSelected: boolean
  onClick: () => void
  onConnect: (a: MatchLog, b: MatchLog) => void
}) {
  const isFarmer = log.contact_type === 'farmer'
  const accentColor  = isFarmer ? '#10b981' : '#60a5fa'
  const accentBg     = isFarmer ? 'rgba(16,185,129,.06)' : 'rgba(96,165,250,.06)'
  const accentBorder = isFarmer ? 'rgba(16,185,129,.18)' : 'rgba(96,165,250,.18)'

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 10, border: `1px solid ${isSelected ? accentColor : accentBorder}`,
        background: isSelected ? accentBg : 'var(--surface)',
        cursor: 'pointer', transition: 'all .15s', marginBottom: 8,
        boxShadow: isSelected ? `0 0 0 1px ${accentColor}33` : 'none',
      }}
    >
      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            {log.crop && <CropBadge crop={log.crop} />}
            {log.quantity && <span style={{ fontSize: 11, color: 'var(--dim)' }}>{log.quantity}</span>}
            {log.timeframe && log.timeframe !== 'unknown' && (
              <span style={{ fontSize: 10, color: 'var(--faint)', fontStyle: 'italic' }}>{TIMEFRAME_LABELS[log.timeframe]}</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {log.contact_name ?? 'Unknown'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
            {log.district}, {log.region}
            {log.price_offered != null && (
              <span style={{ marginLeft: 6, color: '#fbbf24' }}>· GHS {log.price_offered.toLocaleString()}</span>
            )}
          </div>
        </div>
        <MatchCount count={matches.length} />
      </div>

      {isSelected && matches.length > 0 && (
        <div style={{ borderTop: `1px solid ${accentBorder}`, padding: '10px 14px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--dim)', marginBottom: 8 }}>
            {isFarmer ? 'Buyers Looking for This Crop' : 'Farmers Selling This Crop'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {matches.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 7, border: '1px solid var(--border)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.contact_name ?? 'Unknown'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>
                    {m.district}, {m.region}
                    {m.quantity && <span> · {m.quantity}</span>}
                    {m.price_offered != null && <span style={{ color: '#fbbf24' }}> · GHS {m.price_offered.toLocaleString()}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <a
                      href={`tel:${m.phone}`}
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 10, color: 'var(--emerald)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                    >
                      {m.phone}
                    </a>
                    <a
                      href={`https://wa.me/${(m.whatsapp_number || m.phone).replace(/[^0-9]/g, '').replace(/^0/, '233')}`}
                      target='_blank'
                      rel='noreferrer'
                      onClick={e => e.stopPropagation()}
                      style={{ fontSize: 10, color: '#25d366', textDecoration: 'none' }}
                    >
                      WhatsApp
                    </a>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onConnect(log, m) }}
                  style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 6, background: 'rgba(16,185,129,.15)', color: 'var(--emerald)', border: '1px solid rgba(16,185,129,.3)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', whiteSpace: 'nowrap' }}
                  onMouseOver={e => { e.currentTarget.style.background = 'rgba(16,185,129,.25)' }}
                  onMouseOut={e => { e.currentTarget.style.background = 'rgba(16,185,129,.15)' }}
                >
                  Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isSelected && matches.length === 0 && (
        <div style={{ borderTop: `1px solid ${accentBorder}`, padding: '10px 14px', fontSize: 11, color: 'var(--faint)', fontStyle: 'italic', textAlign: 'center' }}>
          No matching {isFarmer ? 'buyers' : 'farmers'} found yet
        </div>
      )}
    </div>
  )
}

export default function MatchingPage() {
  const [logs, setLogs]             = useState<MatchLog[]>([])
  const [loading, setLoading]       = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cropFilter, setCropFilter] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('daily_logs')
      .select(`
        *,
        creator:profiles!daily_logs_created_by_fkey(id, full_name),
        assignee:profiles!daily_logs_assigned_to_fkey(id, full_name)
      `)
      .in('intent', ['sell', 'buy'])
      .not('crop', 'is', null)
      .not('outcome', 'in', '("resolved","not_qualified")')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) { toast.error('Failed to load logs'); setLoading(false); return }
    setLogs((data ?? []) as unknown as MatchLog[])
    setLoading(false)
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  const handleConnect = async (a: MatchLog, b: MatchLog) => {
    const { error } = await supabase
      .from('daily_logs')
      .update({ outcome: 'referred' })
      .in('id', [a.id, b.id])
    if (error) { toast.error('Failed to update'); return }
    toast.success(`Connected: ${a.contact_name} and ${b.contact_name} — both marked Referred`, { duration: 5000 })
    loadLogs()
  }

  const farmers = logs.filter(l => l.contact_type === 'farmer' && l.intent === 'sell')
  const buyers  = logs.filter(l => l.contact_type === 'buyer'  && l.intent === 'buy')
  const filterLog = (l: MatchLog) => !cropFilter || (l.crop ?? '').toLowerCase().includes(cropFilter.toLowerCase())
  const filteredFarmers = farmers.filter(filterLog)
  const filteredBuyers  = buyers.filter(filterLog)
  const totalMatches = farmers.reduce((sum, l) => sum + matchInList(l, logs).length, 0)
  const uniqueCrops  = new Set(logs.map(l => l.crop?.toLowerCase().trim()).filter(Boolean)).size

  if (loading) return (
    <div style={{ padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--emerald)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
        <span style={{ fontSize: 12, color: 'var(--dim)' }}>Loading matches…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '0 28px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Farmers Selling', value: farmers.length, color: '#10b981', bg: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.2)' },
          { label: 'Buyers Looking',  value: buyers.length,  color: '#60a5fa', bg: 'rgba(96,165,250,.08)',  border: 'rgba(96,165,250,.2)' },
          { label: 'Active Matches',  value: totalMatches,   color: '#fbbf24', bg: 'rgba(251,191,36,.08)',  border: 'rgba(251,191,36,.2)' },
          { label: 'Unique Crops',    value: uniqueCrops,    color: '#a78bfa', bg: 'rgba(139,92,246,.08)',  border: 'rgba(139,92,246,.2)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <input
          type='text'
          placeholder='Filter by crop…'
          value={cropFilter}
          onChange={e => setCropFilter(e.target.value)}
          className='form-input'
          style={{ maxWidth: 260, fontSize: 12 }}
        />
        {cropFilter && <button onClick={() => setCropFilter('')} className='btn btn-ghost btn-sm'>Clear</button>}
        <button onClick={loadLogs} className='btn btn-ghost btn-sm' style={{ marginLeft: 'auto' }}>Refresh</button>
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#10b981' }}>Farmers Selling</span>
            <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 'auto' }}>{filteredFarmers.length} contacts</span>
          </div>
          {filteredFarmers.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--faint)', fontSize: 12, fontStyle: 'italic' }}>No active farmer listings</div>
            : filteredFarmers.map(log => (
              <LogCard key={log.id} log={log} matches={matchInList(log, logs)}
                isSelected={selectedId === log.id}
                onClick={() => setSelectedId(selectedId === log.id ? null : log.id)}
                onConnect={handleConnect} />
            ))
          }
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa' }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#60a5fa' }}>Buyers Looking</span>
            <span style={{ fontSize: 10, color: 'var(--dim)', marginLeft: 'auto' }}>{filteredBuyers.length} contacts</span>
          </div>
          {filteredBuyers.length === 0
            ? <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--faint)', fontSize: 12, fontStyle: 'italic' }}>No active buyer listings</div>
            : filteredBuyers.map(log => (
              <LogCard key={log.id} log={log} matches={matchInList(log, logs)}
                isSelected={selectedId === log.id}
                onClick={() => setSelectedId(selectedId === log.id ? null : log.id)}
                onConnect={handleConnect} />
            ))
          }
        </div>
      </div>
    </div>
  )
}
