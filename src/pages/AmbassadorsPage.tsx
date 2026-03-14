import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Ambassador, AmbassadorTier, DailyLog } from '../types';
import {
  computeTierStatus, getTierLabel, nextTier, type TierStatus,
} from '../lib/ambassadorTier';

const REGIONS = [
  'Ashanti','Greater Accra','Central','Eastern','Western','Northern',
  'Upper East','Upper West','Volta','Brong-Ahafo','Savannah','North East',
  'Bono','Bono East','Ahafo','Western North','Oti',
];

const TIER_STYLE: Record<AmbassadorTier, { bg: string; color: string; border: string }> = {
  starter: { bg: 'rgba(113,113,122,.15)', color: '#a1a1aa', border: 'rgba(113,113,122,.3)' },
  active:  { bg: 'rgba(59,130,246,.12)',  color: '#60a5fa', border: 'rgba(59,130,246,.25)' },
  star:    { bg: 'rgba(245,158,11,.12)',   color: '#fbbf24', border: 'rgba(245,158,11,.3)'  },
};
const TIER_SHORT: Record<AmbassadorTier, string> = { starter: 'T1', active: 'T2', star: 'T3' };

function TierBadge({ tier }: { tier: AmbassadorTier }) {
  const s = TIER_STYLE[tier];
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700,
      letterSpacing: '.04em', whiteSpace: 'nowrap', display: 'inline-block',
    }}>
      {TIER_SHORT[tier]} {getTierLabel(tier)}
    </span>
  );
}

interface FD {
  full_name: string; phone: string; whatsapp_number: string;
  region: string; district: string; community: string;
  tier: AmbassadorTier; is_active: boolean;
  payment_number: string; payment_method: string; notes: string;
}
const EF: FD = {
  full_name: '', phone: '', whatsapp_number: '', region: '', district: '',
  community: '', tier: 'starter', is_active: true,
  payment_number: '', payment_method: '', notes: '',
};

export default function AmbassadorsPage() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [logs, setLogs]               = useState<DailyLog[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [form, setForm]               = useState<FD>({ ...EF });
  const [saving, setSaving]           = useState(false);
  const [fRegion, setFRegion]         = useState('');
  const [fTier, setFTier]             = useState<'' | AmbassadorTier>('');
  const [fStatus, setFStatus]         = useState<'' | 'active' | 'inactive'>('');
  const [sel, setSel]                 = useState<Ambassador | null>(null);

  async function load() {
    setLoading(true);
    const [ar, lr] = await Promise.all([
      supabase.from('ambassadors').select('*').order('joined_at', { ascending: false }),
      supabase.from('daily_logs').select('*').not('ambassador_id', 'is', null),
    ]);
    if (ar.error) { setError(ar.error.message); setLoading(false); return; }
    setAmbassadors((ar.data ?? []) as Ambassador[]);
    if (lr.data) setLogs(lr.data as DailyLog[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function openAdd() { setForm({ ...EF }); setEditingId(null); setShowForm(true); }
  function openEdit(a: Ambassador) {
    setForm({
      full_name: a.full_name, phone: a.phone,
      whatsapp_number: a.whatsapp_number ?? '',
      region: a.region, district: a.district,
      community: a.community ?? '', tier: a.tier, is_active: a.is_active,
      payment_number: a.payment_number ?? '',
      payment_method: a.payment_method ?? '', notes: a.notes ?? '',
    });
    setEditingId(a.id); setShowForm(true);
  }

  async function save() {
    if (!form.full_name.trim() || !form.phone.trim() || !form.region || !form.district.trim()) return;
    setSaving(true);
    const payload = {
      full_name: form.full_name.trim(), phone: form.phone.trim(),
      whatsapp_number: form.whatsapp_number.trim() || null,
      region: form.region, district: form.district.trim(),
      community: form.community.trim() || null, tier: form.tier,
      is_active: form.is_active,
      payment_number: form.payment_number.trim() || null,
      payment_method: form.payment_method || null,
      notes: form.notes.trim() || null,
    };
    if (editingId) await supabase.from('ambassadors').update(payload).eq('id', editingId);
    else           await supabase.from('ambassadors').insert([payload]);
    setSaving(false); setShowForm(false); load();
  }

  async function upgradeTier(a: Ambassador, t: AmbassadorTier) {
    await supabase.from('ambassadors').update({ tier: t }).eq('id', a.id); load();
  }

  const ts = new Map<string, TierStatus>();
  for (const a of ambassadors) ts.set(a.id, computeTierStatus(a, logs));

  const filtered = ambassadors.filter(a => {
    if (fRegion && a.region !== fRegion) return false;
    if (fTier  && a.tier   !== fTier)   return false;
    if (fStatus === 'active'   && !a.is_active) return false;
    if (fStatus === 'inactive' &&  a.is_active) return false;
    return true;
  });

  const upgrades  = [...ts.values()].filter(s => s.suggestUpgrade).length;
  const selLogs   = sel ? logs.filter(l => l.ambassador_id === sel.id) : [];
  const tierTargets: Record<AmbassadorTier, number> = { starter: 10, active: 20, star: 30 };

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)' }}>
      <p style={{ color:'var(--dim)', fontStyle:'italic' }}>Loading ambassadors…</p>
    </div>
  );
  if (error) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'var(--bg)' }}>
      <p style={{ color:'var(--red)' }}>{error}</p>
    </div>
  );

  // ── Shared input style shorthand
  const inp: React.CSSProperties = {
    width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
    borderRadius:8, padding:'8px 12px', fontSize:13, fontFamily:'DM Sans, sans-serif',
    color:'var(--text)', outline:'none',
  };
  const sel_style: React.CSSProperties = { ...inp, appearance:'none' as const };
  const lbl: React.CSSProperties = {
    display:'block', fontSize:10, fontWeight:600, textTransform:'uppercase' as const,
    letterSpacing:'.1em', color:'var(--dim)', marginBottom:5,
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', color:'var(--text)', padding:'28px 24px' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 }}>
        <div>
          <h1 style={{ fontFamily:'Syne, sans-serif', fontSize:22, fontWeight:700, color:'var(--text)', margin:0 }}>Ambassadors</h1>
          <p style={{ fontSize:12, color:'var(--dim)', marginTop:4 }}>
            {ambassadors.length} total &middot; {ambassadors.filter(a => a.is_active).length} active
            {upgrades > 0 && (
              <span style={{ marginLeft:8, background:'rgba(245,158,11,.12)', color:'#fbbf24', border:'1px solid rgba(245,158,11,.25)', borderRadius:10, padding:'1px 8px', fontSize:11, fontWeight:600 }}>
                ↑ {upgrades} upgrade{upgrades > 1 ? 's' : ''} ready
              </span>
            )}
          </p>
        </div>
        <button
          onClick={openAdd}
          style={{ background:'var(--emerald)', color:'#fff', border:'none', borderRadius:8, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}
        >
          + Add Ambassador
        </button>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {([
          { label:'Active',            value: ambassadors.filter(a => a.is_active).length,     accent:'var(--emerald)' },
          { label:'Referrals / Month', value: [...ts.values()].reduce((s,t) => s+t.referralsThisMonth, 0), accent:'#60a5fa' },
          { label:'Upgrades Ready',    value: upgrades,                                          accent:'#fbbf24' },
          { label:'Star Ambassadors',  value: ambassadors.filter(a => a.tier === 'star').length, accent:'#a78bfa' },
        ] as { label: string; value: number; accent: string }[]).map(c => (
          <div key={c.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:'18px 20px', borderTop:`2px solid ${c.accent}` }}>
            <div style={{ fontFamily:'Syne, sans-serif', fontSize:30, fontWeight:700, color:c.accent, lineHeight:1 }}>{c.value}</div>
            <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.1em', marginTop:6, color:'var(--dim)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filters ─────────────────────────────────────────── */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        {(['region','tier','status'] as const).map(_ => null)}
        <select value={fRegion} onChange={e => setFRegion(e.target.value)} className="form-select" style={{ width:'auto', minWidth:140 }}>
          <option value="">All Regions</option>
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={fTier} onChange={e => setFTier(e.target.value as '' | AmbassadorTier)} className="form-select" style={{ width:'auto', minWidth:130 }}>
          <option value="">All Tiers</option>
          <option value="starter">T1 Starter</option>
          <option value="active">T2 Active</option>
          <option value="star">T3 Star</option>
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value as '' | 'active' | 'inactive')} className="form-select" style={{ width:'auto', minWidth:130 }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom:24, overflow:'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Ambassador</th>
              <th>Region / District</th>
              <th>Tier</th>
              <th style={{ textAlign:'right' }}>Refs/Mo</th>
              <th style={{ textAlign:'right' }}>Resolved</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => {
              const s   = ts.get(a.id)!;
              const tgt = tierTargets[a.tier];
              const pct = Math.min(100, Math.round((s.referralsThisMonth / tgt) * 100));
              const nt  = nextTier(a.tier);
              return (
                <tr key={a.id} onClick={() => setSel(a)} style={{ cursor:'pointer' }}>
                  <td>
                    <strong>{a.full_name}</strong>
                    <span className="sub">{a.phone}{a.whatsapp_number ? ` · wa: ${a.whatsapp_number}` : ''}</span>
                  </td>
                  <td>
                    {a.region}
                    <span className="sub">{a.district}{a.community ? `, ${a.community}` : ''}</span>
                  </td>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <TierBadge tier={a.tier} />
                      {s.suggestUpgrade && <span style={{ color:'#fbbf24', fontSize:12 }} title={`Eligible: ${s.eligibleTier}`}>↑</span>}
                    </div>
                  </td>
                  <td style={{ textAlign:'right' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                      <span style={{ fontSize:12, fontWeight:600, color: s.referralsThisMonth>=tgt ? 'var(--emerald)' : 'var(--text)' }}>
                        {s.referralsThisMonth}/{tgt}
                      </span>
                      <div style={{ width:56, height:4, background:'var(--surface2)', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ width:`${pct}%`, height:'100%', background: s.referralsThisMonth>=tgt ? 'var(--emerald)' : '#60a5fa', borderRadius:99 }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign:'right', fontWeight:600, color:'var(--text)' }}>{s.verifiedTransactions}</td>
                  <td>
                    <span style={{
                      background: a.is_active ? 'rgba(16,185,129,.1)' : 'rgba(113,113,122,.15)',
                      color:      a.is_active ? 'var(--em-light)'     : 'var(--dim)',
                      border:     `1px solid ${a.is_active ? 'rgba(16,185,129,.2)' : 'rgba(113,113,122,.3)'}`,
                      borderRadius:4, padding:'2px 7px', fontSize:11, fontWeight:700,
                    }}>
                      {a.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                      <button onClick={() => openEdit(a)} style={{ fontSize:12, color:'var(--muted)', background:'none', border:'none', cursor:'pointer', padding:0 }}>Edit</button>
                      {s.suggestUpgrade && nt && (
                        <button onClick={() => upgradeTier(a, s.eligibleTier)} style={{ fontSize:12, color:'#fbbf24', fontWeight:700, background:'none', border:'none', cursor:'pointer', padding:0 }}>
                          ↑ {getTierLabel(nt)}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:'40px 14px', color:'var(--dim)' }}>No ambassadors found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Log Slide Panel ──────────────────────────────────── */}
      {sel && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:50, display:'flex', justifyContent:'flex-end' }}
          onClick={() => setSel(null)}
        >
          <div
            style={{ background:'var(--surface)', width:'100%', maxWidth:480, height:'100%', overflowY:'auto', boxShadow:'-8px 0 32px rgba(0,0,0,.4)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Panel header */}
            <div style={{ padding:'20px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:700, color:'var(--text)', margin:0 }}>{sel.full_name}</h2>
                <div style={{ display:'flex', gap:8, marginTop:6, alignItems:'center' }}>
                  <TierBadge tier={sel.tier} />
                  <span style={{ fontSize:12, color:'var(--dim)' }}>{sel.region}, {sel.district}</span>
                </div>
              </div>
              <button onClick={() => setSel(null)} style={{ background:'none', border:'none', color:'var(--dim)', fontSize:22, cursor:'pointer', lineHeight:1 }}>&times;</button>
            </div>

            {/* Tier stats */}
            {(() => {
              const s   = ts.get(sel.id)!;
              const nt2 = nextTier(sel.tier);
              const ts2 = TIER_STYLE[sel.tier];
              return (
                <div style={{ margin:'16px', padding:'16px', borderRadius:10, border:`2px solid ${ts2.border}`, background:'rgba(255,255,255,.02)' }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--dim)', marginBottom:12 }}>This Month</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:8 }}>
                    {([{ v:s.referralsThisMonth, l:'Referrals' },{ v:s.verifiedTransactions, l:'Resolved' }] as {v:number;l:string}[]).map(x => (
                      <div key={x.l}>
                        <div style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:700, color:'var(--text)' }}>{x.v}</div>
                        <div style={{ fontSize:11, color:'var(--dim)' }}>{x.l}</div>
                      </div>
                    ))}
                    <div>
                      <div style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:700, color:'var(--emerald)' }}>GHS {s.honorarium}</div>
                      <div style={{ fontSize:11, color:'var(--dim)' }}>Base Pay</div>
                    </div>
                  </div>
                  {s.bonusPerTransaction > 0 && s.verifiedTransactions > 0 && (
                    <div style={{ fontSize:11, color:'#60a5fa' }}>+ GHS {s.bonusPerTransaction * s.verifiedTransactions} bonus</div>
                  )}
                  {s.progressToNextTier && nt2 && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)', fontSize:11, color:'var(--dim)' }}>
                      <div style={{ fontWeight:600, color:'var(--muted)', marginBottom:4 }}>To {getTierLabel(nt2)}:</div>
                      {s.progressToNextTier.referralsNeeded > 0    && <div>&bull; {s.progressToNextTier.referralsNeeded} more referrals</div>}
                      {s.progressToNextTier.tenureNeeded > 0        && <div>&bull; {s.progressToNextTier.tenureNeeded} more month(s)</div>}
                      {s.progressToNextTier.transactionsNeeded > 0  && <div>&bull; {s.progressToNextTier.transactionsNeeded} more resolved</div>}
                      {s.progressToNextTier.referralsNeeded === 0 && s.progressToNextTier.tenureNeeded === 0 && s.progressToNextTier.transactionsNeeded === 0 && (
                        <div style={{ color:'var(--em-light)', fontWeight:600 }}>✓ Upgrade ready!</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Referred logs */}
            <div style={{ padding:'0 16px 24px' }}>
              <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'var(--dim)', marginBottom:12 }}>
                Referred Contacts ({selLogs.length})
              </div>
              {selLogs.length === 0 && <div style={{ fontSize:13, color:'var(--dim)', textAlign:'center', padding:'32px 0' }}>No referrals yet</div>}
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {selLogs.map(l => (
                  <div key={l.id} style={{ padding:'10px 12px', background:'var(--surface2)', borderRadius:8, border:'1px solid var(--border)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                      <span style={{ fontWeight:600, fontSize:13, color:'var(--text)' }}>{l.contact_name ?? 'Unknown'}</span>
                      <span style={{
                        fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4,
                        background: l.outcome === 'resolved' ? 'rgba(16,185,129,.1)' : 'rgba(113,113,122,.15)',
                        color:      l.outcome === 'resolved' ? 'var(--em-light)'     : 'var(--dim)',
                      }}>{l.outcome.replace(/_/g,' ')}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--dim)' }}>{l.contact_type} &middot; {l.region} &middot; {l.crop ?? '—'}</div>
                    <div style={{ fontSize:11, color:'var(--faint)', marginTop:2 }}>
                      {new Date(l.created_at).toLocaleDateString('en-GH',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────── */}
      {showForm && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.65)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'var(--surface)', borderRadius:14, boxShadow:'0 24px 64px rgba(0,0,0,.5)', width:'100%', maxWidth:520, padding:24, maxHeight:'90vh', overflowY:'auto', border:'1px solid var(--border)' }}>
            <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:17, fontWeight:700, color:'var(--text)', marginBottom:20 }}>
              {editingId ? 'Edit' : 'Add'} Ambassador
            </h2>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Full Name *</label>
                  <input value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} style={inp} placeholder="e.g. Ama Owusu" />
                </div>
                <div>
                  <label style={lbl}>Phone *</label>
                  <input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} style={inp} placeholder="0244xxxxxx" />
                </div>
              </div>
              <div>
                <label style={lbl}>WhatsApp Number</label>
                <input value={form.whatsapp_number} onChange={e => setForm({...form, whatsapp_number:e.target.value})} style={inp} placeholder="If different from phone" />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Region *</label>
                  <select value={form.region} onChange={e => setForm({...form, region:e.target.value})} style={sel_style}>
                    <option value="">Select region…</option>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>District *</label>
                  <input value={form.district} onChange={e => setForm({...form, district:e.target.value})} style={inp} placeholder="e.g. Kumasi Metro" />
                </div>
              </div>
              <div>
                <label style={lbl}>Community</label>
                <input value={form.community} onChange={e => setForm({...form, community:e.target.value})} style={inp} placeholder="Optional" />
              </div>
              {editingId && (
                <div>
                  <label style={lbl}>Tier</label>
                  <select value={form.tier} onChange={e => setForm({...form, tier:e.target.value as AmbassadorTier})} style={sel_style}>
                    <option value="starter">T1 Starter</option>
                    <option value="active">T2 Active</option>
                    <option value="star">T3 Star</option>
                  </select>
                </div>
              )}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <label style={{ ...lbl, marginBottom:0 }}>Status</label>
                <button
                  type="button"
                  onClick={() => setForm({...form, is_active:!form.is_active})}
                  style={{
                    background: form.is_active ? 'rgba(16,185,129,.12)' : 'rgba(113,113,122,.15)',
                    color:      form.is_active ? 'var(--em-light)'       : 'var(--dim)',
                    border:     `1px solid ${form.is_active ? 'rgba(16,185,129,.25)' : 'rgba(113,113,122,.3)'}`,
                    borderRadius:20, padding:'4px 14px', fontSize:12, fontWeight:700, cursor:'pointer',
                  }}
                >
                  {form.is_active ? '● Active' : '○ Inactive'}
                </button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                  <label style={lbl}>Payment Number</label>
                  <input value={form.payment_number} onChange={e => setForm({...form, payment_number:e.target.value})} style={inp} placeholder="MoMo number" />
                </div>
                <div>
                  <label style={lbl}>Payment Method</label>
                  <select value={form.payment_method} onChange={e => setForm({...form, payment_method:e.target.value})} style={sel_style}>
                    <option value="">Select…</option>
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="vodafone_cash">Vodafone Cash</option>
                    <option value="airteltigo_money">AirtelTigo Money</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={lbl}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes:e.target.value})}
                  style={{ ...inp, resize:'none' as const }} rows={2} />
              </div>
            </div>
            <div style={{ display:'flex', gap:12, marginTop:20 }}>
              <button onClick={() => setShowForm(false)} style={{ flex:1, padding:'10px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--muted)', fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button
                onClick={save}
                disabled={saving || !form.full_name || !form.phone || !form.region || !form.district}
                style={{ flex:1, padding:'10px', background:'var(--emerald)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity: (saving||!form.full_name||!form.phone||!form.region||!form.district) ? 0.5 : 1 }}
              >
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Ambassador'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
