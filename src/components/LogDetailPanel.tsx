import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import type { DailyLog, DailyLogWithProfiles, Outcome } from '../types'
import {
  CONTACT_TYPE_LABELS,
  CHANNEL_LABELS,
  INTENT_LABELS,
  TIMEFRAME_LABELS,
  OUTCOME_LABELS,
  contactTypeBadge,
  outcomeBadge,
  followupBadge,
  FOLLOWUP_STATUS_LABELS,
} from '../types'
import { findMatches, isMatchable } from '../lib/matching'

interface Props {
  log: DailyLogWithProfiles | null
  isAdmin: boolean
  currentUserId: string
  onClose: () => void
  onUpdate: (id: string, updates: { notes?: string; outcome?: string }) => Promise<unknown>
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
  const [editNotes, setEditNotes]     = useState('')
  const [editOutcome, setEditOutcome] = useState<Outcome>('pending')
  const [editing, setEditing]         = useState(false)
  const [saving, setSaving]           = useState(false)
  const [matches, setMatches]         = useState<DailyLog[]>([])

  useEffect(() => {
    setMatches([])
    if (!log || !isMatchable(log)) return
    findMatches(log.crop!, log.intent as 'sell' | 'buy', log.id)
      .then(setMatches)
  }, [log?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const canEdit = log ? (log.created_by === currentUserId || isAdmin) : false

  const startEdit = () => {
    if (!log) return
    setEditNotes(log.notes ?? '')
    setEditOutcome(log.outcome)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!log) return
    setSaving(true)
    try {
      await onUpdate(log.id, { notes: editNotes, outcome: editOutcome })
      toast.success('Log updated.')
      setEditing(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save.')
    }
    setSaving(false)
  }

  if (!log) return null

  const logNum = log.id.slice(0, 8) + '…'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(9,9,11,.75)', backdropFilter: 'blur(4px)' }}
      />

      {/* Sliding panel */}
      <div style={{
        position: 'fixed', right: 0, top: 0, height: '100vh', width: 460,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        zIndex: 101, display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        animation: 'slideIn .22s ease-out',
      }}>
        <style>{`@keyframes slideIn { from { transform:translateX(32px);opacity:0 } to { transform:translateX(0);opacity:1 } }`}</style>

        {/* Header */}
        <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff' }}>Log Details</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--dim)', marginTop: 1 }}>
              {logNum} · {format(new Date(log.created_at), 'HH:mm')}
              {log.creator && ` · ${log.creator.full_name}`}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--dim)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            onMouseOver={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--dim)' }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', flex: 1 }}>
          {/* Status badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            <span className={contactTypeBadge(log.contact_type)}>{CONTACT_TYPE_LABELS[log.contact_type]}</span>
            <span className={outcomeBadge(log.outcome)}>{OUTCOME_LABELS[log.outcome]}</span>
            <span className={followupBadge(log.followup_status)}>{FOLLOWUP_STATUS_LABELS[log.followup_status]}</span>
          </div>

          {/* Contact */}
          <div style={{ marginBottom: 18 }}>
            <SectionTitle>Contact</SectionTitle>
            <DR label="Time"     value={format(new Date(log.created_at), 'PPp')} />
            <DR label="Name"     value={log.contact_name} />
            <DR label="Phone"    value={log.phone} />
            <DR label="Channel"  value={CHANNEL_LABELS[log.channel]} />
            <DR label="Location" value={`${log.district}, ${log.region}`} />
            <DR label="Community" value={log.community} />
            <DR label="GPS"      value={log.gps_code} />
          </div>

          {/* Intent */}
          <div style={{ marginBottom: 18 }}>
            <SectionTitle>Intent</SectionTitle>
            <DR label="Intent"    value={INTENT_LABELS[log.intent]} />
            <DR label="Crop"      value={log.crop} />
            <DR label="Quantity"  value={log.quantity} />
            <DR label="Timeframe" value={log.timeframe ? TIMEFRAME_LABELS[log.timeframe] : null} />
          </div>

          {/* ⚡ Potential Matches */}
          {matches.length > 0 && (
            <div style={{
              background: 'rgba(251,191,36,.07)',
              border: '1px solid rgba(251,191,36,.2)',
              borderRadius: 10,
              padding: 14,
              marginBottom: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#fbbf24', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid rgba(251,191,36,.15)' }}>
                <span>⚡</span>
                <span>Potential {log!.intent === 'sell' ? 'Buyers' : 'Farmers'} — {matches.length} match{matches.length > 1 ? 'es' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {matches.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 10px', background: 'rgba(251,191,36,.05)', borderRadius: 7, border: '1px solid rgba(251,191,36,.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#f4f4f5' }}>{m.phone}</span>
                      {m.contact_name && <span style={{ fontSize: 11, color: '#a1a1aa' }}>{m.contact_name}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#a1a1aa' }}>
                      {[m.crop, m.quantity, m.region].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up (amber box if pending) */}
          {log.followup_needed && (
            <div style={{
              background: log.followup_status === 'pending' ? 'rgba(245,158,11,.07)' : 'rgba(16,185,129,.07)',
              border: `1px solid ${log.followup_status === 'pending' ? 'rgba(245,158,11,.15)' : 'rgba(16,185,129,.15)'}`,
              borderRadius: 10, padding: 14, marginBottom: 18,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.12em', color: log.followup_status === 'pending' ? 'var(--amber)' : 'var(--em-light)', marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${log.followup_status === 'pending' ? 'rgba(245,158,11,.2)' : 'rgba(16,185,129,.2)'}` }}>
                Follow-up
              </div>
              <DR label="Due"      value={log.followup_datetime ? format(new Date(log.followup_datetime), 'PPp') : null} />
              <DR label="Assigned" value={log.assignee?.full_name} />
              {log.followup_status === 'done' && (
                <>
                  <DR label="Done At"  value={log.followup_done_at ? format(new Date(log.followup_done_at), 'PPp') : null} />
                  <DR label="Done Note" value={log.followup_done_note} />
                </>
              )}
            </div>
          )}

          {/* Notes + Edit section */}
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
                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={4} value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Additional notes…" />
                </div>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  style={{ width: '100%', padding: 9, borderRadius: 8, background: 'var(--emerald)', color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', marginTop: 4, fontFamily: 'inherit', transition: 'background .15s' }}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{ width: '100%', padding: 9, borderRadius: 8, background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 600, border: '1px solid var(--border)', cursor: 'pointer', marginTop: 8, fontFamily: 'inherit' }}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12, color: log.notes ? 'var(--text)' : 'var(--faint)', fontStyle: log.notes ? 'normal' : 'italic', whiteSpace: 'pre-wrap', marginBottom: canEdit ? 16 : 0 }}>
                  {log.notes || 'No notes.'}
                </p>
                {canEdit && (
                  <button
                    onClick={startEdit}
                    className="btn btn-ghost btn-sm"
                  >
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
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
