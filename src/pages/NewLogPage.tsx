import React, { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { findMatches, isMatchable } from '../lib/matching'
import type { DailyLog, LeadTemperature } from '../types'
import {
  type NewLogFormValues,
  type Profile,
  DEFAULT_FORM_VALUES,
  CONTACT_TYPE_LABELS,
  CHANNEL_LABELS,
  INTENT_LABELS,
  TIMEFRAME_LABELS,
  OUTCOME_LABELS,
  LANGUAGE_LABELS,
  PAYMENT_METHOD_LABELS,
  PRICE_UNIT_LABELS,
  outcomeBadge,
  leadTempColor,
} from '../types'

// ── Phone history types ───────────────────────────────────
interface PhoneHistoryRow {
  id: string
  created_at: string
  contact_name: string | null
  intent: string
  outcome: string
  crop: string | null
  quantity: string | null
  region: string | null
  notes: string | null
}

function PhoneHistoryModal({ rows, phone, onClose }: { rows: PhoneHistoryRow[]; phone: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(9,9,11,.6)', backdropFilter: 'blur(3px)' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 480, maxHeight: '70vh', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: '0 24px 60px rgba(0,0,0,.6)', zIndex: 301, display: 'flex', flexDirection: 'column', animation: 'popIn .18s ease-out' }}>
        <style>{`@keyframes popIn { from { transform:translate(-50%,-50%) scale(.95);opacity:0 } to { transform:translate(-50%,-50%) scale(1);opacity:1 } }`}</style>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff' }}>Contact History</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>{phone} · {rows.length} previous contact{rows.length !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--dim)' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ padding: '12px 18px', borderBottom: i < rows.length - 1 ? '1px solid rgba(63,63,70,.4)' : 'none', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: 68 }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>{format(new Date(r.created_at), 'dd MMM yy')}</div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{format(new Date(r.created_at), 'HH:mm')}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{INTENT_LABELS[r.intent as keyof typeof INTENT_LABELS] ?? r.intent}</span>
                  {r.crop && <span style={{ fontSize: 11, color: 'var(--dim)' }}>· {r.crop}{r.quantity ? `, ${r.quantity}` : ''}</span>}
                  {r.region && <span style={{ fontSize: 11, color: 'var(--dim)' }}>· {r.region}</span>}
                </div>
                {r.notes && <div style={{ fontSize: 11, color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.notes}</div>}
              </div>
              <span className={outcomeBadge(r.outcome as Parameters<typeof outcomeBadge>[0])} style={{ flexShrink: 0 }}>{OUTCOME_LABELS[r.outcome as keyof typeof OUTCOME_LABELS] ?? r.outcome}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span style={{ color: 'var(--emerald)', marginLeft: 2 }}>*</span>}</label>
      {children}
    </div>
  )
}

function Section({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="section-block" style={{ height: '100%', marginBottom: 0, ...style }}>
      <h3>{title}</h3>
      {children}
    </div>
  )
}

// ── Lead Temperature Toggle ───────────────────────────────
function LeadTempToggle({ value, onChange }: { value: LeadTemperature; onChange: (v: LeadTemperature) => void }) {
  const opts: { v: LeadTemperature; label: string; emoji: string }[] = [
    { v: 'hot',  label: 'Hot',  emoji: '🔥' },
    { v: 'warm', label: 'Warm', emoji: '☀️' },
    { v: 'cold', label: 'Cold', emoji: '🧊' },
  ]
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {opts.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
            border: `1px solid ${value === o.v ? leadTempColor(o.v) : 'var(--border)'}`,
            background: value === o.v ? `${leadTempColor(o.v)}22` : 'transparent',
            color: value === o.v ? leadTempColor(o.v) : 'var(--dim)',
          }}
        >
          {o.emoji} {o.label}
        </button>
      ))}
    </div>
  )
}

export default function NewLogPage() {
  const [form, setForm]             = useState<NewLogFormValues>(DEFAULT_FORM_VALUES)
  const [submitting, setSubmitting] = useState(false)
  const [profiles, setProfiles]     = useState<Profile[]>([])

  const [phoneHistory, setPhoneHistory]   = useState<PhoneHistoryRow[]>([])
  const [phoneChecking, setPhoneChecking] = useState(false)
  const [historyOpen, setHistoryOpen]     = useState(false)
  const phoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, role, is_active, created_at')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setProfiles((data ?? []) as unknown as Profile[]))
  }, [])

  const checkPhoneHistory = useCallback(async (phone: string) => {
    const trimmed = phone.trim().replace(/\s+/g, '')
    if (trimmed.length < 8) { setPhoneHistory([]); return }
    setPhoneChecking(true)
    const { data } = await supabase
      .from('daily_logs')
      .select('id, created_at, contact_name, intent, outcome, crop, quantity, region, notes')
      .eq('phone', trimmed)
      .order('created_at', { ascending: false })
      .limit(20)
    setPhoneHistory((data ?? []) as unknown as PhoneHistoryRow[])
    setPhoneChecking(false)
  }, [])

  const set = (key: keyof NewLogFormValues, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (key === 'phone') {
      const v = value as string
      setPhoneHistory([])
      if (phoneTimerRef.current) clearTimeout(phoneTimerRef.current)
      phoneTimerRef.current = setTimeout(() => checkPhoneHistory(v), 600)
    }
  }

  const showCrop        = form.intent === 'sell' || form.intent === 'buy'
  const showQty         = showCrop && form.crop.trim().length > 0
  const showPrice       = form.intent === 'sell' || form.intent === 'buy'
  const showFarmSize    = form.contact_type === 'farmer'
  const showAmbassador  = form.channel === 'referral'

  const validate = (): string | null => {
    if (!form.contact_name.trim())     return 'Contact name is required.'
    if (form.phone.trim().length < 8)  return 'Phone number must be at least 8 characters.'
    if (!form.region.trim())           return 'Region is required.'
    if (!form.district.trim())         return 'District is required.'
    if (form.followup_needed) {
      if (!form.followup_datetime)     return 'Follow-up date/time is required.'
      if (!form.assigned_to)           return 'Please assign this follow-up to a team member.'
    }
    return null
  }

  const showMatchToast = (matches: DailyLog[], intent: 'sell' | 'buy') => {
    const label = intent === 'sell' ? 'Buyer' : 'Farmer'
    const first = matches[0]
    toast(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: '#fbbf24' }}>
            <span>⚡</span><span>Potential Match{matches.length > 1 ? 'es' : ''} Found</span>
          </div>
          <div style={{ fontSize: 11, color: '#d1d5db', lineHeight: 1.4 }}>
            {matches.length > 1
              ? `${matches.length} ${label}s interested in this crop`
              : `${label} in ${first.region ?? 'Unknown'} needs ${first.crop}${first.quantity ? ` — ${first.quantity}` : ''}`}
          </div>
          <button onClick={() => toast.dismiss(t.id)} style={{ alignSelf: 'flex-end', fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Dismiss</button>
        </div>
      ),
      { duration: 8000, style: { background: '#1c1a10', border: '1px solid rgba(245,158,11,.35)', color: '#f4f4f5', maxWidth: 320 } }
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { toast.error(err); return }

    setSubmitting(true)
    const { data: authData } = await supabase.auth.getUser()
    const user = authData.user
    if (!user) { toast.error('Not authenticated'); setSubmitting(false); return }

    const payload = {
      created_by:           user.id,
      contact_type:         form.contact_type,
      channel:              form.channel,
      contact_name:         form.contact_name.trim(),
      phone:                form.phone.trim(),
      whatsapp_number:      form.whatsapp_number.trim() || null,
      language_preference:  form.language_preference || null,
      lead_temperature:     form.lead_temperature || null,
      ambassador_id:        showAmbassador ? (form.ambassador_id.trim() || null) : null,
      referral_source_name: showAmbassador ? (form.referral_source_name.trim() || null) : null,
      region:               form.region.trim(),
      district:             form.district.trim(),
      community:            form.community.trim() || null,
      gps_code:             form.gps_code.trim() || null,
      intent:               form.intent,
      crop:                 showCrop  ? (form.crop.trim() || null) : null,
      quantity:             showQty   ? (form.quantity.trim() || null) : null,
      timeframe:            form.timeframe,
      price_offered:        showPrice && form.price_offered ? parseFloat(form.price_offered) : null,
      price_unit:           showPrice && form.price_offered ? (form.price_unit || null) : null,
      payment_method_pref:  form.payment_method_pref || null,
      farm_size_acres:      showFarmSize && form.farm_size_acres ? parseFloat(form.farm_size_acres) : null,
      outcome:              form.outcome,
      followup_needed:      form.followup_needed,
      followup_datetime:    form.followup_needed ? form.followup_datetime || null : null,
      assigned_to:          form.followup_needed ? (form.assigned_to || null) : null,
      followup_status:      form.followup_needed ? 'pending' as const : 'none' as const,
      notes:                form.notes.trim() || null,
    }

    const { data: insertedRows, error } = await supabase
      .from('daily_logs')
      .insert(payload as Record<string, unknown>)
      .select('id')

    if (error) { toast.error(error.message); setSubmitting(false); return }

    toast.success('Log saved successfully!')

    if (isMatchable({ contact_type: form.contact_type, intent: form.intent, crop: form.crop })) {
      const savedId = (insertedRows as unknown as { id: string }[])?.[0]?.id
      const matches = await findMatches(form.crop, form.intent as 'sell' | 'buy', savedId)
      if (matches.length > 0) showMatchToast(matches, form.intent as 'sell' | 'buy')
    }

    setForm(DEFAULT_FORM_VALUES)
    setPhoneHistory([])
    document.getElementById('contact_type_field')?.focus()
    setSubmitting(false)
  }

  const twoCol  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } as const
  const gridWrap = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'start' } as const

  return (
    <div style={{ padding: '0 28px' }}>
      <form onSubmit={handleSubmit}>

        {/* ── Row 1: Contact Details | Location ── */}
        <div style={{ ...gridWrap, marginBottom: 14 }}>
          <Section title="Contact Details">
            <div style={twoCol}>
              <Field label="Contact Type" required>
                <select id="contact_type_field" className="form-select" value={form.contact_type} onChange={e => set('contact_type', e.target.value)}>
                  {Object.entries(CONTACT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Channel" required>
                <select className="form-select" value={form.channel} onChange={e => set('channel', e.target.value)}>
                  {Object.entries(CHANNEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Contact Name" required>
                <input className="form-input" type="text" placeholder="Full name" value={form.contact_name} onChange={e => set('contact_name', e.target.value)} required />
              </Field>
              <Field label="Language">
                <select className="form-select" value={form.language_preference} onChange={e => set('language_preference', e.target.value)}>
                  {Object.entries(LANGUAGE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Phone" required>
                <div>
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="0XX XXX XXXX"
                    value={form.phone}
                    onChange={e => set('phone', e.target.value)}
                    required
                    style={{ borderColor: phoneHistory.length > 0 ? 'rgba(245,158,11,.5)' : undefined }}
                  />
                  {phoneChecking && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5, fontSize: 10, color: 'var(--dim)' }}>
                      <span style={{ width: 10, height: 10, border: '1.5px solid var(--dim)', borderTopColor: 'var(--emerald)', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />
                      Checking history…
                    </div>
                  )}
                </div>
              </Field>
              <Field label="WhatsApp Number">
                <input
                  className="form-input"
                  type="tel"
                  placeholder="If different from phone"
                  value={form.whatsapp_number}
                  onChange={e => set('whatsapp_number', e.target.value)}
                />
              </Field>
            </div>

            {/* Lead Temperature */}
            <div style={{ marginTop: 14 }}>
              <label className="form-label">Lead Temperature</label>
              <LeadTempToggle value={form.lead_temperature} onChange={v => set('lead_temperature', v)} />
            </div>

            {/* Ambassador fields — shown only when channel = referral */}
            {showAmbassador && (
              <div style={{ marginTop: 14, padding: 12, background: 'rgba(139,92,246,.07)', border: '1px solid rgba(139,92,246,.2)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#a78bfa', marginBottom: 10 }}>Ambassador Referral</div>
                <div style={twoCol}>
                  <Field label="Ambassador ID">
                    <input className="form-input" type="text" placeholder="AMB-XXXXXXXX" value={form.ambassador_id} onChange={e => set('ambassador_id', e.target.value)} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} />
                  </Field>
                  <Field label="Referred By (Name)">
                    <input className="form-input" type="text" placeholder="Ambassador full name" value={form.referral_source_name} onChange={e => set('referral_source_name', e.target.value)} />
                  </Field>
                </div>
              </div>
            )}

            {/* Phone history banner */}
            {phoneHistory.length > 0 && (
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 8, padding: '9px 13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="14" height="14" fill="none" stroke="#f59e0b" viewBox="0 0 24 24" strokeWidth={2} style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 600 }}>{phoneHistory.length} previous contact{phoneHistory.length !== 1 ? 's' : ''} found</span>
                </div>
                <button type="button" onClick={() => setHistoryOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, background: 'rgba(245,158,11,.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }} onMouseOver={e => (e.currentTarget.style.background = 'rgba(245,158,11,.25)')} onMouseOut={e => (e.currentTarget.style.background = 'rgba(245,158,11,.15)')}>
                  <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View History
                </button>
              </div>
            )}
          </Section>

          <Section title="Location">
            <div style={twoCol}>
              <Field label="Region" required>
                <input className="form-input" type="text" placeholder="e.g. Ashanti" value={form.region} onChange={e => set('region', e.target.value)} required />
              </Field>
              <Field label="District" required>
                <input className="form-input" type="text" placeholder="e.g. Kumasi Metropolitan" value={form.district} onChange={e => set('district', e.target.value)} required />
              </Field>
              <Field label="Community">
                <input className="form-input" type="text" placeholder="Village / suburb" value={form.community} onChange={e => set('community', e.target.value)} />
              </Field>
              <Field label="GPS Code">
                <input className="form-input" type="text" placeholder="AK-019-4422" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }} value={form.gps_code} onChange={e => set('gps_code', e.target.value)} />
              </Field>
            </div>

            {/* Payment + Farm size */}
            <div style={{ marginTop: 14 }}>
              <div style={twoCol}>
                <Field label="Payment Preference">
                  <select className="form-select" value={form.payment_method_pref} onChange={e => set('payment_method_pref', e.target.value)}>
                    <option value="">— Select —</option>
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                {showFarmSize && (
                  <Field label="Farm Size (Acres)">
                    <input className="form-input" type="number" min="0" step="0.1" placeholder="e.g. 2.5" value={form.farm_size_acres} onChange={e => set('farm_size_acres', e.target.value)} />
                  </Field>
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* ── Row 2: Intent & Commodity | Outcome + Notes ── */}
        <div style={{ ...gridWrap, marginBottom: 14 }}>
          <Section title="Intent &amp; Commodity">
            <div style={twoCol}>
              <Field label="Intent" required>
                <select className="form-select" value={form.intent} onChange={e => set('intent', e.target.value)}>
                  {Object.entries(INTENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Timeframe">
                <select className="form-select" value={form.timeframe} onChange={e => set('timeframe', e.target.value)}>
                  {Object.entries(TIMEFRAME_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Crop / Produce">
                <input
                  className="form-input"
                  type="text"
                  placeholder={showCrop ? 'e.g. Maize, Tomatoes' : 'Select sell / buy intent first'}
                  value={form.crop}
                  onChange={e => set('crop', e.target.value)}
                  disabled={!showCrop}
                  style={{ opacity: showCrop ? 1 : 0.4 }}
                />
              </Field>
              <Field label="Quantity">
                <input
                  className="form-input"
                  type="text"
                  placeholder={showQty ? 'e.g. 50 bags, 2 tonnes' : '—'}
                  value={form.quantity}
                  onChange={e => set('quantity', e.target.value)}
                  disabled={!showQty}
                  style={{ opacity: showQty ? 1 : 0.4 }}
                />
              </Field>
            </div>

            {/* Price fields */}
            {showPrice && (
              <div style={{ marginTop: 14, padding: 12, background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--emerald)', marginBottom: 10 }}>Pricing</div>
                <div style={twoCol}>
                  <Field label="Price Offered (GHS)">
                    <input className="form-input" type="number" min="0" step="0.01" placeholder="e.g. 250" value={form.price_offered} onChange={e => set('price_offered', e.target.value)} />
                  </Field>
                  <Field label="Price Unit">
                    <select className="form-select" value={form.price_unit} onChange={e => set('price_unit', e.target.value)}>
                      {Object.entries(PRICE_UNIT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            )}
          </Section>

          <Section title="Outcome">
            <Field label="Outcome" required>
              <select className="form-select" value={form.outcome} onChange={e => set('outcome', e.target.value)} style={{ marginBottom: 14 }}>
                {Object.entries(OUTCOME_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Notes">
              <textarea className="form-textarea" rows={4} placeholder="Additional notes…" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </Section>
        </div>

        {/* ── Row 3: Follow-up (full width) ── */}
        <div className="section-block" style={{ marginBottom: 14 }}>
          <h3>Follow-up</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: form.followup_needed ? 14 : 0 }}>
            <button type="button" role="switch" aria-checked={form.followup_needed} onClick={() => set('followup_needed', !form.followup_needed)} style={{ width: 36, height: 20, background: form.followup_needed ? 'var(--emerald)' : 'var(--surface2)', borderRadius: 99, position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0, border: `1px solid ${form.followup_needed ? 'var(--emerald)' : 'var(--border)'}`, outline: 'none' }}>
              <span style={{ position: 'absolute', top: 2, left: 2, width: 14, height: 14, background: '#fff', borderRadius: 99, transition: 'transform .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)', transform: form.followup_needed ? 'translateX(16px)' : 'translateX(0)', display: 'block' }} />
            </button>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Follow-up needed</span>
          </div>
          {form.followup_needed && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Field label="Follow-up Date / Time" required>
                <input className="form-input" type="datetime-local" value={form.followup_datetime} onChange={e => set('followup_datetime', e.target.value)} required={form.followup_needed} />
              </Field>
              <Field label="Assigned To" required>
                <select className="form-select" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} required={form.followup_needed}>
                  <option value="">— Select team member —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                </select>
              </Field>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 28 }}>
          <button type="button" className="btn btn-ghost" onClick={() => { setForm(DEFAULT_FORM_VALUES); setPhoneHistory([]) }} disabled={submitting}>Reset</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (
              <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin .7s linear infinite' }} />Saving…</>
            ) : (
              <><svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Save Log</>
            )}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {historyOpen && phoneHistory.length > 0 && (
        <PhoneHistoryModal rows={phoneHistory} phone={form.phone.trim()} onClose={() => setHistoryOpen(false)} />
      )}
    </div>
  )
}
