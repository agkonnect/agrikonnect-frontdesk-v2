import { useEffect, useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';

const REGIONS = [
  'Ashanti','Greater Accra','Central','Eastern','Western','Northern',
  'Upper East','Upper West','Volta','Brong-Ahafo','Savannah','North East',
  'Bono','Bono East','Ahafo','Western North','Oti',
];
const UNITS = ['kg','bag (50kg)','bag (100kg)','crate','bunch','tuber','litre','piece','tonne'];

interface MarketPrice {
  id: string;
  crop: string;
  region: string;
  market_name: string | null;
  price_low: number;
  price_high: number;
  unit: string;
  notes: string | null;
  recorded_at: string;
  recorded_by: string | null;
}

interface FormData {
  crop: string; region: string; market_name: string;
  price_low: string; price_high: string; unit: string; notes: string;
}
const EMPTY: FormData = { crop:'', region:'', market_name:'', price_low:'', price_high:'', unit:'kg', notes:'' };

const inp: React.CSSProperties = {
  width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
  borderRadius:8, padding:'8px 12px', fontSize:13,
  fontFamily:'DM Sans, sans-serif', color:'var(--text)', outline:'none',
};
const sel_sty: React.CSSProperties = { ...inp, appearance:'none' as const };
const lbl: React.CSSProperties = {
  display:'block', fontSize:10, fontWeight:600, textTransform:'uppercase' as const,
  letterSpacing:'.1em', color:'var(--dim)', marginBottom:5,
};

export default function MarketPricesPage() {
  const [prices, setPrices]         = useState<MarketPrice[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState<FormData>({ ...EMPTY });
  const [saving, setSaving]         = useState(false);
  const [formError, setFormError]   = useState<string | null>(null);
  const [cropFilter, setCropFilter] = useState('');
  const [chartCrop, setChartCrop]   = useState('');
  const [copied, setCopied]         = useState(false);

  // All unique crops from logs (for autocomplete)
  const [logCrops, setLogCrops] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    const [pr, lr] = await Promise.all([
      supabase.from('market_prices').select('*').order('recorded_at', { ascending: false }).limit(500),
      supabase.from('daily_logs').select('crop').not('crop', 'is', null),
    ]);
    if (pr.error) { setError(pr.error.message); setLoading(false); return; }
    const data = (pr.data ?? []) as MarketPrice[];
    setPrices(data);
    if (lr.data) {
      const crops = [...new Set(lr.data.map((r: { crop: string | null }) => r.crop).filter(Boolean) as string[])].sort();
      setLogCrops(crops);
    }
    if (data.length > 0 && !chartCrop) setChartCrop(data[0].crop);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  // Latest price per crop+region
  const latestPrices = useMemo(() => {
    const map = new Map<string, MarketPrice>();
    for (const p of [...prices].reverse()) map.set(`${p.crop}::${p.region}`, p);
    return [...map.values()].sort((a, b) => a.crop.localeCompare(b.crop));
  }, [prices]);

  // Chart data: price history for selected crop (last 30 days)
  const chartData = useMemo(() => {
    if (!chartCrop) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return prices
      .filter(p => p.crop === chartCrop && new Date(p.recorded_at) >= cutoff)
      .map(p => ({
        date: new Date(p.recorded_at).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' }),
        low: p.price_low, high: p.price_high,
        market: p.market_name ?? p.region,
      }))
      .reverse();
  }, [prices, chartCrop]);

  // All unique crops in price data
  const priceCrops = useMemo(() => [...new Set(prices.map(p => p.crop))].sort(), [prices]);

  // Filtered latest prices
  const filteredLatest = useMemo(() =>
    latestPrices.filter(p => !cropFilter || p.crop.toLowerCase().includes(cropFilter.toLowerCase()))
  , [latestPrices, cropFilter]);

  async function handleSave() {
    setFormError(null);
    const low = parseFloat(form.price_low);
    const high = parseFloat(form.price_high);
    if (!form.crop.trim() || !form.region || isNaN(low) || isNaN(high)) {
      setFormError('Crop, region, price low and high are required.');
      return;
    }
    if (low > high) { setFormError('Price low must be ≤ price high.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('market_prices').insert([{
      crop: form.crop.trim(), region: form.region,
      market_name: form.market_name.trim() || null,
      price_low: low, price_high: high, unit: form.unit,
      notes: form.notes.trim() || null,
    }]);
    setSaving(false);
    if (err) { setFormError(err.message); return; }
    setShowForm(false); setForm({ ...EMPTY }); load();
  }

  function exportWhatsApp() {
    const byRegion = new Map<string, MarketPrice[]>();
    for (const p of latestPrices) {
      const arr = byRegion.get(p.region) ?? [];
      arr.push(p); byRegion.set(p.region, arr);
    }
    const lines = ['📊 *AgriKonnect Market Prices*', `_Updated ${new Date().toLocaleDateString('en-GH', { day:'numeric', month:'short', year:'numeric' })}_`, ''];
    for (const [region, items] of byRegion) {
      lines.push(`*${region}*`);
      for (const p of items) lines.push(`  • ${p.crop}: GHS ${p.price_low}–${p.price_high}/${p.unit}${p.market_name ? ` (${p.market_name})` : ''}`);
      lines.push('');
    }
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)' }}>
      <p style={{ color:'var(--dim)', fontStyle:'italic' }}>Loading market prices…</p>
    </div>
  );
  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)' }}>
      <p style={{ color:'var(--red)' }}>{error}</p>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', padding:'28px 24px' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, color:'var(--text)', margin:0 }}>Market Price Board</h1>
          <p style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>{latestPrices.length} crops tracked across {new Set(latestPrices.map(p=>p.region)).size} regions</p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button
            onClick={exportWhatsApp}
            style={{ background:'rgba(16,185,129,.1)', color:'var(--em-light)', border:'1px solid var(--em-border)', borderRadius:8, padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer' }}
          >
            {copied ? '✓ Copied!' : '📲 Export for WhatsApp'}
          </button>
          <button
            onClick={() => { setShowForm(s => !s); setFormError(null); setForm({...EMPTY}); }}
            style={{ background:'var(--emerald)', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}
          >
            {showForm ? '✕ Cancel' : '+ Log Price'}
          </button>
        </div>
      </div>

      {/* ── Log Price Form ──────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ padding:20, marginBottom:24 }}>
          <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:16 }}>Log New Price</h3>
          {formError && <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#fca5a5', borderRadius:8, padding:'8px 12px', fontSize:13, marginBottom:12 }}>{formError}</div>}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
            <div>
              <label style={lbl}>Crop *</label>
              <input
                value={form.crop}
                onChange={e => setForm({...form, crop:e.target.value})}
                list="crop-options" style={inp} placeholder="e.g. Maize"
              />
              <datalist id="crop-options">
                {logCrops.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label style={lbl}>Region *</label>
              <select value={form.region} onChange={e => setForm({...form, region:e.target.value})} style={sel_sty}>
                <option value="">Select region…</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Market Name</label>
              <input value={form.market_name} onChange={e => setForm({...form, market_name:e.target.value})} style={inp} placeholder="e.g. Kumasi Central" />
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:12 }}>
            <div>
              <label style={lbl}>Price Low (GHS) *</label>
              <input type="number" min="0" value={form.price_low} onChange={e => setForm({...form, price_low:e.target.value})} style={inp} placeholder="0.00" />
            </div>
            <div>
              <label style={lbl}>Price High (GHS) *</label>
              <input type="number" min="0" value={form.price_high} onChange={e => setForm({...form, price_high:e.target.value})} style={inp} placeholder="0.00" />
            </div>
            <div>
              <label style={lbl}>Unit</label>
              <select value={form.unit} onChange={e => setForm({...form, unit:e.target.value})} style={sel_sty}>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Notes</label>
            <input value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} style={inp} placeholder="Optional notes" />
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
            <button onClick={() => setShowForm(false)} style={{ padding:'8px 16px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--muted)', fontSize:13, cursor:'pointer' }}>Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ padding:'8px 18px', background:'var(--emerald)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:saving?0.6:1 }}
            >
              {saving ? 'Saving…' : 'Save Price'}
            </button>
          </div>
        </div>
      )}

      {/* ── Main Grid: Latest Prices + Chart ────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:16, marginBottom:16 }}>

        {/* Latest Prices Table */}
        <div className="card" style={{ overflow:'hidden' }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Latest Prices</span>
            <input
              value={cropFilter}
              onChange={e => setCropFilter(e.target.value)}
              placeholder="Filter crop…"
              style={{ ...inp, width:130, padding:'5px 10px', fontSize:12 }}
            />
          </div>
          <div style={{ maxHeight:400, overflowY:'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Crop</th>
                  <th>Region</th>
                  <th style={{ textAlign:'right' }}>Range (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {filteredLatest.map(p => (
                  <tr key={p.id} onClick={() => setChartCrop(p.crop)} style={{ cursor:'pointer', background: chartCrop===p.crop ? 'rgba(16,185,129,.06)' : '' }}>
                    <td><strong>{p.crop}</strong><span className="sub">{p.unit}</span></td>
                    <td>{p.region}{p.market_name ? <span className="sub">{p.market_name}</span> : null}</td>
                    <td style={{ textAlign:'right' }}>
                      <span style={{ color:'var(--amber)', fontWeight:600, fontFamily:'JetBrains Mono, monospace', fontSize:12 }}>
                        {p.price_low}–{p.price_high}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredLatest.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign:'center', padding:'32px 14px', color:'var(--dim)' }}>No prices logged yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Price History Chart */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Price History (30 days)</span>
            <select value={chartCrop} onChange={e => setChartCrop(e.target.value)} style={{ ...sel_sty, width:'auto', minWidth:130, padding:'5px 28px 5px 10px', fontSize:12 }}>
              <option value="">Select crop…</option>
              {priceCrops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {chartData.length === 0 ? (
            <div style={{ height:300, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--dim)', fontSize:13 }}>
              {chartCrop ? 'No data in last 30 days' : 'Select a crop to view history'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top:5, right:10, left:0, bottom:5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fill:'var(--dim)', fontSize:11 }} />
                <YAxis tick={{ fill:'var(--dim)', fontSize:11 }} width={45} />
                <Tooltip
                  contentStyle={{ background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:12 }}
                  formatter={(val: number | undefined) => [`GHS ${val ?? 0}`, '']}
                />
                <Legend wrapperStyle={{ fontSize:12, color:'var(--muted)' }} />
                <Line type="monotone" dataKey="low"  stroke="#60a5fa" strokeWidth={2} dot={false} name="Price Low" />
                <Line type="monotone" dataKey="high" stroke="var(--emerald)" strokeWidth={2} dot={false} name="Price High" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Recent Entries ───────────────────────────────────── */}
      <div className="card" style={{ overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>Recent Entries</span>
          <span style={{ marginLeft:8, fontSize:12, color:'var(--dim)' }}>({Math.min(prices.length, 50)} most recent)</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Crop</th>
              <th>Region</th>
              <th>Market</th>
              <th style={{ textAlign:'right' }}>Low</th>
              <th style={{ textAlign:'right' }}>High</th>
              <th>Unit</th>
              <th>Notes</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {prices.slice(0, 50).map(p => (
              <tr key={p.id}>
                <td><strong>{p.crop}</strong></td>
                <td>{p.region}</td>
                <td>{p.market_name ?? <span style={{ color:'var(--faint)' }}>—</span>}</td>
                <td style={{ textAlign:'right' }} className="mono">GHS {p.price_low}</td>
                <td style={{ textAlign:'right' }} className="mono">GHS {p.price_high}</td>
                <td>{p.unit}</td>
                <td>{p.notes ?? <span style={{ color:'var(--faint)' }}>—</span>}</td>
                <td style={{ color:'var(--dim)' }}>
                  {new Date(p.recorded_at).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'})}
                </td>
              </tr>
            ))}
            {prices.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign:'center', padding:'40px 14px', color:'var(--dim)' }}>No prices logged yet. Click &ldquo;Log Price&rdquo; to add the first entry.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
