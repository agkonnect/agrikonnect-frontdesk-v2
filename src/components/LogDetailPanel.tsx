import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { DailyLog, DailyLogWithProfiles, Outcome, VerificationStatus } from '../types'
import {
  CONTACT_TYPE_LABELS,
  CHANNEL_LABELS,
  INTENT_LABELS,
  TIMEFRAME_LABELS,
  OUTCOME_LABELS,
  LANGUAGE_LABELS,
  PAYMENT_METHOD_LABELS,
  PRICE_UNIT_LABELS,
  VERIFICATION_STATUS_LABELS,
  contactTypeBadge,
  outcomeBadge,
  followupBadge,
  verificationBadge,
  leadTempColor,
  FOLLOWUP_STATUS_LABELS,
} from '../types'
import { findMatches, isMatchable } from '../lib/matching'

interface Props {
  log: DailyLogWithProfiles | null
  isAdmin: boolean
  currentUserId: string
  onClose: () => void
  onUpdate: (id: string, updates: { notes?: string; outcome?: string; verification_status?: string }) => Promise<unknown>
}

function DR({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
      <span style={{ width: 100, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text)' }}>{value}</span>
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--dim)', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
      {children}
    </div>
  )
}

export default function LogDetailPanel({ log, isAdmin, currentUserId, onClose, onUpdate }: Props) {
  const [editNotes, setEditNotes]                 = useState('')
  const [editOutcome, setEditOutcome]             = useState<Outcome>('pending')
  const [editVerification, setEditVerification]   = useState<VerificationStatus>('unverified')
  const [editing, setEditing]                     = useState(false)
  const [saving, setSaving]                       = useState(false)
  const [matches, setMatches]                     = useState<DailyLog[]>([])

  useEffect(() => {
    setMatches([])
    if (!log || !isMatchable(log)) return
    findMatches(log.crop!, log.intent as 'sell' | 'buy', log.id).then(setMatches)
  }, [log?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const canEdit = log ? (log.created_by === currentUserId || isAdmin) : false

  const startEdit = () => {
    if (!log) return
    setEditNotes(log.notes ?? '')
    setEditOutcome(log.outcome)
    setEditVerification((log.verification_status as VerificationStatus) ?? 'unverified')
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!log) return
    setSaving(true)
    try {
      await onUpdate(log.id, {
        notes: editNotes,
        outcome: editOutcome,
        ...(isAdmin ? { verification_status: editVerification } : {}),
      })
      toast.success('Log updated.')
      setEditing(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save.')
    }
    setSaving(false)
  }

  // Quick WhatsApp open
  const openWhatsApp = (number: string) => {
    const clean = number.replace(/[^0-9]/g, '')
    const intl = clean.startsWith('0') ? '233' + clean.slice(1) : clean
    window.open(`https://wa.me/${intl}`, '_blank')
  }

  if (!log) return null

  const logNum = log.id.slice(0, 8) + '…'
  const waNumber = log.whatsapp_number || log.phone

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(9,9,11,.75)', backdropFilter: 'blur(4px)' }} />

      {/* Sliding panel */}
      <div style={{ position: 'fixed', right: 0, top: 0, height: '100vh', width: 460, background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 101, display: 'flex', flexDirection: 'column', overflowY: 'auto', animation: 'slideIn .22s ease-out' }}>
        <style>{`@keyframes slideIn { from { transform:translateX(32px);opacity:0 } to { transform:translateX(0);opacity:1 } }`}</style>

        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff' }}>Log Details</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>
              {logNum} · {format(new Date(log.created_at), 'HH:mm')}{log.creator && ` · ${log.creator.full_name}`}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* WhatsApp quick action */}
            <button
              onClick={() => openWhatsApp(waNumber)}
              title="Open WhatsApp"
              style={{ width: 30, height: 30, borderRadius: 7, background: 'rgba(37,211,102,.12)', border: '1px solid rgba(37,211,102,.3)', color: '#25d366', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(37,211,102,.22)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'rgba(37,211,102,.12)' }}
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            </button>
            <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--dim)' }}>✕</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', flex: 1 }}>

          {/* Status badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className={contactTypeBadge(log.contact_type)}>{CONTACT_TYPE_LABELS[log.contact_type]}</span>
            <span className={outcomeBadge(log.outcome)}>{OUTCOME_LABELS[log.outcome]}</span>
            <span className={followupBadge(log.followup_status)}>{FOLLOWUP_STATUS_LABELS[log.followup_status]}</span>
            {log.verification_status && (
              <span className={verificationBadge(log.verification_status as 'unverified'|'pending'|'verified')}>
                {VERIFICATION_STATUS_LABELS[log.verification_status as 'unverified'|'pending'|'verified']}
              </span>
            )}
            {log.lead_temperature && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: `1px solid ${leadTempColor(log.lead_temperature)}44`, background: `${leadTempColor(log.lead_temperature)}18`, color: leadTempColor(log.lead_temperature) }}>
                {log.lead_temperature === 'hot' ? '🔥' : log.lead_temperature === 'warm' ? '☀️' : '🧊'} {log.lead_temperature.charAt(0).toUpperCase() + log.lead_temperature.slice(1)}
              </span>
            )}
          </div>

          {/* Contact */}
          <div style={{ marginBottom: 18 }}>
            <SectionTitle>Contact</SectionTitle>
            <DR label="Time"      value={format(new Date(log.created_at), 'PPp')} />
            <DR label="Name"      value={log.contact_name} />
            <DR label="Phone"     value={log.phone} />
            <DR label="WhatsApp"  value={log.whatsapp_number} />
            <DR label="Language"  value={log.language_preference ? LANGUAGE_LABELS[log.language_preference as keyof typeof LANGUAGE_LABELS] : null} />
            <DR label="Channel"   value={CHANNEL_LABELS[log.channel]} />
            <DR label="Location"  value={`${log.district}, ${log.region}`} />
            <DR label="Community" value={log.community} />
            <DR label="GPS"       value={log.gps_code} />
            <DR label="Payment"   value={log.payment_method_pref ? PAYMENT_METHOD_LABELS[log.payment_method_pref as keyof typeof PAYMENT_METHOD_LABELS] : null} />
            {log.ambassador_id && <DR label="Ambassador" value={`${log.ambassador_id}${log.referral_source_name ? ` · ${log.referral_source_name}` : ''}`} />}
          </div>

          {/* Intent */}
          <div style={{ marginBottom: 18 }}>
            <SectionTitle>Intent</SectionTitle>
            <DR label="Intent"     value={INTENT_LABELS[log.intent]} />
            <DR label="Crop"       value={log.crop} />
            <DR label="Quantity"   value={log.quantity} />
            <DR label="Timeframe"  value={log.timeframe ? TIMEFRAME_LABELS[log.timeframe] : null} />
            {log.price_offered != null && (
              <DR label="Price" value={`GHS ${log.price_offered.toLocaleString()} ${log.price_unit ? PRICE_UNIT_LABELS[log.price_unit] ?? log.price_unit : ''}`} />
            )}
            {log.farm_size_acres != null && <DR label="Farm Size" value={`${log.farm_size_acres} acres`} />}
          </div>

          {/* ⚡ Potential Matches */}
          {matches.length > 0 && (
            <div style={{ background: 'rgba(251,191,36,.07)', border: '1px solid rgba(251,191,36,.2)', borderRadius: 10, padding: 14, marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#fbbf24', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(251,191,36,.15)' }}>
                <span>⚡</span>
                <span>Potential {log.intent === 'sell' ? 'Buyers' : 'Farmers'} — {matches.length} match{matches.length > 1 ? 'es' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matches.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', background: 'rgba(251,191,36,.05)', borderRadius: 7, border: '1px solid rgba(251,191,36,.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#f4f4f5' }}>{m.phone}</span>
                      {m.contact_name && <span style={{ fontSize: 11, color: '#a1a1aa' }}>{m.contact_name}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#a1a1aa' }}>{[m.crop, m.quantity, m.region].filter(Boolean).join(' · ')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up */}
          {log.followup_needed && (
            <div style={{ background: log.followup_status === 'pending' ? 'rgba(245,158,11,.07)' : 'rgba(16,185,129,.07)', border: `1px solid ${log.followup_status === 'pending' ? 'rgba(245,158,11,.15)' : 'rgba(16,185,129,.15)'}`, borderRadius: 10, padding: 14, marginBottom: 18 }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: log.followup_status === 'pending' ? 'var(--amber)' : 'var(--em-light)', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${log.followup_status === 'pending' ? 'rgba(245,158,11,.2)' : 'rgba(16,185,129,.2)'}` }}>Follow-up</div>
              <DR label="Due"       value={log.followup_datetime ? format(new Date(log.followup_datetime), 'PPp') : null} />
              <DR label="Assigned"  value={log.assignee?.full_name} />
              {log.followup_status === 'done' && (
                <>
                  <DR label="Done At"   value={log.followup_done_at ? format(new Date(log.followup_done_at), 'PPp') : null} />
                  <DR label="Done Note" value={log.followup_done_note} />
                </>
              )}
            </div>
          )}

          {/* Notes + Edit */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--dim)', marginBottom: 12 }}>
              {editing ? 'Edit' : 'Notes'}
            </div>
            {editing ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Outcome</label>
                  <select className="form-select" value={editOutcome} onChange={e => setEditOutcome(e.target.value as Outcome)}>
                    {Object.entries(OUTCOME_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                {isAdmin && (
                  <div style={{ marginBottom: 12 }}>
                    <label className="form-label">Verification Status</label>
                    <select className="form-select" value={editVerification} onChange={e => setEditVerification(e.target.value as VerificationStatus)}>
                      {Object.entries(VERIFICATION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={4} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Additional notes…" />
                </div>
                <button onClick={saveEdit} disabled={saving} style={{ width: '100%', padding: 9, borderRadius: 8, background: 'var(--emerald)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 4, fontFamily: 'inherit', transition: 'background .15s' }}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button onClick={() => setEditing(false)} style={{ width: '100%', padding: 9, borderRadius: 8, background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}>Cancel</button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: log.notes ? 'var(--text)' : 'var(--faint)', fontStyle: log.notes ? 'normal' : 'italic', whiteSpace: 'pre-wrap', marginBottom: canEdit ? 16 : 0 }}>
                  {log.notes || 'No notes.'}
                </p>
                {canEdit && (
                  <button onClick={startEdit} className="btn btn-ghost btn-sm">
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Edit Notes / Outcome
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
