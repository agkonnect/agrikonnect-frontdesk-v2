import { useState } from 'react'
import type { DailyLogWithProfiles } from '../types'
import { INTENT_LABELS } from '../types'

interface Props {
  log: DailyLogWithProfiles
  onConfirm: (note: string) => Promise<void>
  onCancel: () => void
}

export default function MarkDoneModal({ log, onConfirm, onCancel }: Props) {
  const [note, setNote]     = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    await onConfirm(note)
    setSaving(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(9,9,11,.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Modal */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border2)',
            borderRadius: 16,
            padding: 24,
            width: 420,
            animation: 'popIn .2s ease-out',
          }}
        >
          <style>{`@keyframes popIn { from { transform:scale(.95);opacity:0 } to { transform:scale(1);opacity:1 } }`}</style>

          <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
            Mark Follow-up Done
          </h3>
          <p style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 18 }}>
            {log.phone}{log.contact_name ? ` · ${log.contact_name}` : ''} · {INTENT_LABELS[log.intent]}
            {log.assignee ? ` · Assigned to ${log.assignee.full_name}` : ''}
          </p>

          <div style={{ marginBottom: 4 }}>
            <label className="form-label">
              Done note <span style={{ color: 'var(--dim)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="What was the outcome of this follow-up?"
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={onCancel} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
              Cancel
            </button>
            <button onClick={handleConfirm} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={saving}>
              {saving ? (
                <>
                  <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Saving…
                </>
              ) : (
                <>
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm Done
                </>
              )}
            </button>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    </>
  )
}
