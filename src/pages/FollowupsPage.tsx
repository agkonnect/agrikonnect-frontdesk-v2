import { useEffect, useState } from 'react'
import { format, isPast, isToday } from 'date-fns'
import toast from 'react-hot-toast'
import { useFollowups, type FollowupTab } from '../hooks/useFollowups'
import MarkDoneModal from '../components/MarkDoneModal'
import type { DailyLogWithProfiles } from '../types'
import { INTENT_LABELS } from '../types'

const WA_MESSAGE = encodeURIComponent(
  "Hello, this is AgriKonnect. We're following up on your recent inquiry. How can we assist you today?"
)

/** Convert a Ghanaian phone number to the international format required by wa.me */
function toGhanaWaPhone(raw: string): string {
  const cleaned = raw.replace(/[\s\-().+]/g, '')
  if (cleaned.startsWith('233')) return cleaned           // already 233XXXXXXXXX
  if (cleaned.startsWith('0'))   return '233' + cleaned.slice(1) // 0XX → 233XX
  return '233' + cleaned                                 // bare number → prepend 233
}

function whatsappUrl(phone: string): string {
  return `https://wa.me/${toGhanaWaPhone(phone)}?text=${WA_MESSAGE}`
}

const TABS: { id: FollowupTab; label: string }[] = [
  { id: 'due_today', label: 'Due Today' },
  { id: 'overdue',   label: 'Overdue'   },
  { id: 'all_pending', label: 'All Pending' },
]

function isOverdue(dt: string | null) {
  if (!dt) return false
  return isPast(new Date(dt)) && !isToday(new Date(dt))
}

export default function FollowupsPage() {
  const { followups, loading, error, fetchFollowups, markDone } = useFollowups()
  const [activeTab, setActiveTab] = useState<FollowupTab>('due_today')
  const [markingLog, setMarkingLog] = useState<DailyLogWithProfiles | null>(null)

  useEffect(() => { fetchFollowups(activeTab) }, [activeTab, fetchFollowups])

  const handleMarkDone = async (note: string) => {
    if (!markingLog) return
    try {
      await markDone(markingLog.id, note)
      toast.success('Follow-up marked as done.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update.')
    }
    setMarkingLog(null)
  }

  return (
    <div style={{ padding: '0 28px' }}>
      {/* Pill tabs */}
      <div style={{ display: 'flex', gap: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 4, width: 'fit-content', marginBottom: 18 }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
              border: `1px solid ${activeTab === tab.id ? 'var(--em-border)' : 'transparent'}`,
              background: activeTab === tab.id ? 'var(--em-dim)' : 'transparent',
              color: activeTab === tab.id ? 'var(--em-light)' : 'var(--dim)',
              transition: 'all .15s',
            }}
          >
            {tab.label}
            {activeTab === tab.id && followups.length > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 99,
                background: 'rgba(16,185,129,.15)',
                color: 'var(--em-light)',
              }}>
                {followups.length}
              </span>
            )}
          </button>
        ))}

        <button
          onClick={() => fetchFollowups(activeTab)}
          disabled={loading}
          style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--dim)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit', paddingRight: 4 }}
        >
          <svg className={loading ? 'animate-spin' : ''} width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Due Date/Time</th><th>Phone / Name</th><th>Location</th>
                <th>Intent + Crop</th><th>Assigned To</th><th>Notes</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--dim)' }}>Loading…</td></tr>
              )}
              {!loading && followups.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 14px', textAlign: 'center', color: 'var(--faint)' }}>
                    {activeTab === 'due_today' ? 'No follow-ups due today.'
                      : activeTab === 'overdue' ? 'No overdue follow-ups.'
                      : 'No pending follow-ups.'}
                  </td>
                </tr>
              )}
              {followups.map(log => {
                const overdue = isOverdue(log.followup_datetime)
                return (
                  <tr key={log.id}>
                    <td className="mono">
                      <span style={{ color: overdue ? '#f87171' : undefined }}>
                        {log.followup_datetime ? format(new Date(log.followup_datetime), 'dd MMM, HH:mm') : '—'}
                      </span>
                      {overdue && <span style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block' }}>Overdue</span>}
                    </td>
                    <td>
                      <div className="mono">{log.phone}</div>
                      {log.contact_name && <span className="sub">{log.contact_name}</span>}
                    </td>
                    <td>
                      <strong>{log.district}</strong>
                      <span className="sub">{log.region}</span>
                    </td>
                    <td>
                      <span>{INTENT_LABELS[log.intent]}</span>
                      {log.crop && <span className="sub">{log.crop}</span>}
                    </td>
                    <td>{log.assignee?.full_name ?? <span style={{ color: 'var(--faint)' }}>Unassigned</span>}</td>
                    <td style={{ maxWidth: 150 }}>
                      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--dim)', fontSize: 11 }}>
                        {log.notes || <span style={{ color: 'var(--faint)', fontStyle: 'italic' }}>—</span>}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {/* WhatsApp button */}
                        <a
                          href={whatsappUrl(log.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`WhatsApp ${log.phone}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            background: 'rgba(37,211,102,.12)',
                            color: '#25D366',
                            border: '1px solid rgba(37,211,102,.25)',
                            padding: '5px 10px',
                            fontSize: 11, fontWeight: 700,
                            borderRadius: 6, cursor: 'pointer',
                            textDecoration: 'none',
                            transition: 'background .15s',
                            whiteSpace: 'nowrap',
                          }}
                          onMouseOver={e => (e.currentTarget.style.background = 'rgba(37,211,102,.22)')}
                          onMouseOut={e =>  (e.currentTarget.style.background = 'rgba(37,211,102,.12)')}
                        >
                          {/* WhatsApp logo mark */}
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WhatsApp
                        </a>

                        {/* Mark Done button */}
                        <button className="btn-done" onClick={() => setMarkingLog(log)}>
                          <svg width="11" height="11" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Mark Done
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {markingLog && (
        <MarkDoneModal
          log={markingLog}
          onConfirm={handleMarkDone}
          onCancel={() => setMarkingLog(null)}
        />
      )}
    </div>
  )
}
