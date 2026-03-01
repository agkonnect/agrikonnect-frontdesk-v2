import { useContext } from 'react'
import { AuthContext } from '../hooks/AuthContext'
import { format } from 'date-fns'

export default function SettingsPage() {
  const { profile, user, signOut } = useContext(AuthContext)

  const memberSince = user?.created_at
    ? format(new Date(user.created_at), 'MMM d, yyyy')
    : '—'

  return (
    <div style={{ padding: '0 28px' }}>
      {/* Account card */}
      <div className="card" style={{ maxWidth: 440, marginBottom: 14 }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Account</span>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)' }}>Name</span>
            <span style={{ fontSize: 12, color: 'var(--text)' }}>{profile?.full_name ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)' }}>Email</span>
            <span style={{ fontSize: 11, color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{user?.email ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)' }}>Role</span>
            <span className={`badge ${profile?.role === 'admin' ? 'badge-partner' : 'badge-resolved'}`}>
              {profile?.role ?? '—'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)' }}>Member since</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{memberSince}</span>
          </div>
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* App info card */}
      <div className="card" style={{ maxWidth: 440 }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>App</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)' }}>Version</span>
            <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'JetBrains Mono, monospace' }}>1.0.0</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ width: 100, flexShrink: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)' }}>Platform</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>AgriKonnect Front Desk</span>
          </div>
        </div>
      </div>
    </div>
  )
}
