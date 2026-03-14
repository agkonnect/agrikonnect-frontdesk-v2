import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { format, subDays, parseISO } from 'date-fns'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { useContext } from 'react'
import { AuthContext } from '../hooks/AuthContext'
import { PRICE_UNIT_LABELS } from '../types'

const GHANA_REGIONS = [
  'Ashanti','Greater Accra','Central','Eastern','Western','Northern',
  'Upper East','Upper West','Volta','Brong-Ahafo','Savannah','North East',
  'Bono','Bono East','Ahafo','Western North','Oti',
]

const PRICE_UNITS = Object.entries(PRICE_UNIT_LABELS)

interface MarketPrice {
  id: string
  created_at: string
  created_by: string | null
  crop: string
  region: string
  market_name: string | null
  price_low: number
  price_high: number
  unit: string
  source: string | null
  notes: string | null
}

interface FormState {
  crop: string
  region: string
  market_name: string
  price_low: string
  price_high: string
  unit: string
  notes: string
}

const EMPTY_FORM: FormState = {
  crop: '',
  region: '',
  market_name: '',
  price_low: '',
  price_high: '',
  unit: 'per_bag_50kg',
  notes: '',
}

// Get unique latest price per crop (most recent entry)
function getLatestPerCrop(prices: MarketPrice[]): MarketPrice[] {
  const seen = new Map<string, MarketPrice>()
  for (const p of prices) {
    const key = `${p.crop.toLowerCase()}|${p.region}`
    if (!seen.has(key)) seen.set(key, p)
  }
  return Array.from(seen.values())
}

// Format price range for WhatsApp
function formatForWhatsApp(prices: MarketPrice[]): string {
  const latest = getLatestPerCrop(prices)
  if (latest.length === 0) return 'No prices available.'
  
  const dateStr = format(new Date(), 'dd MMM yyyy')
  let msg = `🌾 *AgriKonnect Market Prices — ${dateStr}*\n\n`
  
  const byRegion = latest.reduce((acc, p) => {
    const r = p.region
    if (!acc[r]) acc[r] = []
    acc[r].push(p)
    return acc
  }, {} as Record<string, MarketPrice[]>)

  for (const [region, items] of Object.entries(byRegion)) {
    msg += `📍 *${region}*\n`
    for (const item of items) {
      const unit = PRICE_UNIT_LABELS[item.unit] ?? item.unit
      const market = item.market_name ? ` (${item.market_name})` : ''
      msg += `  • ${item.crop}${market}: GHS ${item.price_low}–${item.price_high} ${unit}\n`
    }
    msg += '\n'
  }
  
  msg += '_For more info, contact AgriKonnect: wa.me/233540404098_'
  return msg
}

export default function MarketPricesPage() {
  const { profile } = useContext(AuthContext)
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM })
  const [selectedCrop, setSelectedCrop] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [cropSuggestions, setCropSuggestions] = useState<string[]>([])

  // Load all prices (last 60 days)
  async function load() {
    setLoading(true)
    const since = subDays(new Date(), 60).toISOString()
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
    if (error) { toast.error('Failed to load prices'); setLoading(false); return }
    setPrices((data ?? []) as MarketPrice[])
    setLoading(false)
  }

  // Load existing crop names for autocomplete
  async function loadCropSuggestions() {
    const { data } = await supabase
      .from('daily_logs')
      .select('crop')
      .not('crop', 'is', null)
    if (data) {
      const unique = [...new Set(
        data.map(r => r.crop).filter(Boolean).map((c: string) => c.trim())
      )].sort() as string[]
      setCropSuggestions(unique)
    }
  }

  useEffect(() => { load(); loadCropSuggestions() }, [])

  const set = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.crop.trim() || !form.region || !form.price_low || !form.price_high) {
      toast.error('Please fill in crop, region, and both price fields')
      return
    }
    const low = parseFloat(form.price_low)
    const high = parseFloat(form.price_high)
    if (isNaN(low) || isNaN(high) || low > high) {
      toast.error('Price low must be ≤ price high')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('market_prices').insert([{
      crop: form.crop.trim().toLowerCase(),
      region: form.region,
      market_name: form.market_name.trim() || null,
      price_low: low,
      price_high: high,
      unit: form.unit,
      notes: form.notes.trim() || null,
      created_by: profile?.id ?? null,
      source: 'cs_agent',
    }])
    setSaving(false)
    if (error) { toast.error(error.message); return }
    toast.success('Price logged successfully')
    setForm({ ...EMPTY_FORM })
    setShowForm(false)
    load()
  }

  function copyWhatsApp() {
    const msg = formatForWhatsApp(prices)
    navigator.clipboard.writeText(msg)
    toast.success('Copied to clipboard — paste into WhatsApp')
  }

  // Latest price per crop+region for the table
  const latestPrices = useMemo(() => getLatestPerCrop(prices), [prices])

  // Unique crops for the chart selector
  const uniqueCrops = useMemo(() => {
    const s = new Set(prices.map(p => p.crop))
    return [...s].sort()
  }, [prices])

  // Chart data: last 30 days for selected crop
  const chartData = useMemo(() => {
    if (!selectedCrop) return []
    const filtered = prices
      .filter(p => p.crop === selectedCrop)
      .slice(0, 30)
      .reverse()
    return filtered.map(p => ({
      date: format(parseISO(p.created_at), 'dd MMM'),
      low: p.price_low,
      high: p.price_high,
      region: p.region,
    }))
  }, [prices, selectedCrop])

  const S = {
    page: { padding: '0 28px' } as React.CSSProperties,
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 } as React.CSSProperties,
    title: { fontSize: 16, fontWeight: 700, color: 'var(--text)' } as React.CSSProperties,
    sub: { fontSize: 11, color: 'var(--dim)', marginTop: 2 } as React.CSSProperties,
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 } as React.CSSProperties,
    cardHeader: { padding: '11px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties,
    cardTitle: { fontSize: 12, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase' as const, letterSpacing: '.08em' },
    btn: { fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'inherit' } as React.CSSProperties,
    btnPrimary: { background: 'var(--emerald)', color: '#fff' } as React.CSSProperties,
    btnGhost: { background: 'rgba(255,255,255,.06)', color: 'var(--text)', border: '1px solid var(--border)' } as React.CSSProperties,
    btnWhatsApp: { background: '#25d366', color: '#fff' } as React.CSSProperties,
    label: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.1em', color: 'var(--dim)', display: 'block', marginBottom: 5 },
    input: { width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,.05)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' as const },
    select: { width: '100%', padding: '8px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' as const },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 } as React.CSSProperties,
    grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 } as React.CSSProperties,
    th: { padding: '7px 14px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.1em', color: 'var(--dim)', textAlign: 'left' as const, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const },
    td: { padding: '9px 14px', fontSize: 12, color: 'var(--text)', borderBottom: '1px solid rgba(255,255,255,.04)', verticalAlign: 'middle' as const },
  }

  return (
    <div style={S.page}>
      {/* Page Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Market Prices</h1>
          <p style={S.sub}>{latestPrices.length} crops tracked · Last 60 days</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={copyWhatsApp}
            style={{ ...S.btn, ...S.btnWhatsApp }}
          >
            📲 Export for WhatsApp
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            style={{ ...S.btn, ...S.btnPrimary }}
          >
            {showForm ? '✕ Cancel' : '+ Log Price'}
          </button>
        </div>
      </div>

      {/* Add Price Form */}
      {showForm && (
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Log New Market Price</span>
          </div>
          <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={S.grid3}>
              <div>
                <label style={S.label}>Crop *</label>
                <input
                  style={S.input}
                  list="crop-list"
                  value={form.crop}
                  onChange={e => set('crop', e.target.value)}
                  placeholder="e.g. tomato"
                />
                <datalist id="crop-list">
                  {cropSuggestions.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label style={S.label}>Region *</label>
                <select style={S.select} value={form.region} onChange={e => set('region', e.target.value)}>
                  <option value="">Select region…</option>
                  {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Market Name</label>
                <input
                  style={S.input}
                  value={form.market_name}
                  onChange={e => set('market_name', e.target.value)}
                  placeholder="e.g. Kumasi Central Market"
                />
              </div>
            </div>
            <div style={S.grid3}>
              <div>
                <label style={S.label}>Price Low (GHS) *</label>
                <input
                  style={S.input}
                  type="number" min="0" step="0.01"
                  value={form.price_low}
                  onChange={e => set('price_low', e.target.value)}
                  placeholder="e.g. 220"
                />
              </div>
              <div>
                <label style={S.label}>Price High (GHS) *</label>
                <input
                  style={S.input}
                  type="number" min="0" step="0.01"
                  value={form.price_high}
                  onChange={e => set('price_high', e.target.value)}
                  placeholder="e.g. 280"
                />
              </div>
              <div>
                <label style={S.label}>Unit</label>
                <select style={S.select} value={form.unit} onChange={e => set('unit', e.target.value)}>
                  {PRICE_UNITS.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={S.label}>Notes</label>
              <input
                style={S.input}
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Optional notes (e.g. quality, weather impact)"
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={saving} style={{ ...S.btn, ...S.btnPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save Price'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ ...S.btn, ...S.btnGhost }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Two-column layout: Table + Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>

        {/* Latest Prices Table */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>Latest Prices by Crop</span>
            <span style={{ fontSize: 10, color: 'var(--dim)' }}>{latestPrices.length} entries</span>
          </div>
          {loading ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>Loading…</div>
          ) : latestPrices.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
              No prices logged yet.<br />
              <span style={{ color: 'var(--emerald)', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowForm(true)}>Log the first price →</span>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={S.th}>Crop</th>
                    <th style={S.th}>Region</th>
                    <th style={S.th}>Price (GHS)</th>
                    <th style={S.th}>Unit</th>
                    <th style={S.th}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {latestPrices.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedCrop(p.crop)}
                      style={{
                        cursor: 'pointer',
                        background: selectedCrop === p.crop ? 'rgba(16,185,129,.07)' : 'transparent',
                        transition: 'background .1s',
                      }}
                    >
                      <td style={S.td}>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize', color: selectedCrop === p.crop ? 'var(--emerald)' : 'var(--text)' }}>
                          {p.crop}
                        </span>
                        {p.market_name && (
                          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>{p.market_name}</div>
                        )}
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.region}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontWeight: 700, color: '#fbbf24' }}>
                          {p.price_low.toLocaleString()} – {p.price_high.toLocaleString()}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 10, color: 'var(--dim)' }}>
                          {PRICE_UNIT_LABELS[p.unit] ?? p.unit}
                        </span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 10, color: 'var(--dim)' }}>
                          {format(parseISO(p.created_at), 'dd MMM')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Price History Chart */}
        <div style={S.card}>
          <div style={S.cardHeader}>
            <span style={S.cardTitle}>
              Price History{selectedCrop ? ` — ${selectedCrop}` : ''}
            </span>
            {uniqueCrops.length > 0 && (
              <select
                style={{ ...S.select, width: 'auto', padding: '4px 8px', fontSize: 11 }}
                value={selectedCrop}
                onChange={e => setSelectedCrop(e.target.value)}
              >
                <option value="">Select crop…</option>
                {uniqueCrops.map(c => (
                  <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c}</option>
                ))}
              </select>
            )}
          </div>
          <div style={{ padding: 16 }}>
            {!selectedCrop ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
                👆 Click a crop in the table or select from the dropdown to view its price history
              </div>
            ) : chartData.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
                No history data for {selectedCrop}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'var(--dim)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--dim)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1a2e22', border: '1px solid rgba(16,185,129,.25)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: 'var(--emerald)', fontWeight: 700, marginBottom: 4 }}
                    itemStyle={{ color: '#d1fae5' }}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    formatter={((val: number | undefined, name: string | undefined) => [`GHS ${(val ?? 0).toLocaleString()}`, name === 'low' ? 'Price Low' : 'Price High']) as any}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, color: 'var(--dim)', paddingTop: 8 }}
                    formatter={(v) => v === 'low' ? 'Price Low' : 'Price High'}
                  />
                  <Line type="monotone" dataKey="low" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="high" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3, fill: '#fbbf24' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Entries Log */}
      <div style={S.card}>
        <div style={S.cardHeader}>
          <span style={S.cardTitle}>Recent Entries</span>
          <span style={{ fontSize: 10, color: 'var(--dim)' }}>Last 60 days · {prices.length} total</span>
        </div>
        {prices.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>No entries yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={S.th}>Date</th>
                  <th style={S.th}>Crop</th>
                  <th style={S.th}>Region</th>
                  <th style={S.th}>Market</th>
                  <th style={S.th}>Low</th>
                  <th style={S.th}>High</th>
                  <th style={S.th}>Unit</th>
                  <th style={S.th}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {prices.slice(0, 50).map(p => (
                  <tr key={p.id} style={{ transition: 'background .1s' }}>
                    <td style={S.td}>
                      <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                        {format(parseISO(p.created_at), 'dd MMM, HH:mm')}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{p.crop}</span>
                    </td>
                    <td style={S.td}><span style={{ fontSize: 11, color: 'var(--muted)' }}>{p.region}</span></td>
                    <td style={S.td}><span style={{ fontSize: 11, color: 'var(--dim)' }}>{p.market_name ?? '—'}</span></td>
                    <td style={S.td}>
                      <span style={{ color: '#10b981', fontWeight: 600 }}>GHS {p.price_low.toLocaleString()}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>GHS {p.price_high.toLocaleString()}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 10, color: 'var(--dim)' }}>{PRICE_UNIT_LABELS[p.unit] ?? p.unit}</span>
                    </td>
                    <td style={S.td}>
                      <span style={{ fontSize: 11, color: 'var(--dim)', fontStyle: p.notes ? 'normal' : 'italic' }}>
                        {p.notes ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
