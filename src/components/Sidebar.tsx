import { NavLink } from 'react-router-dom'
import type { Profile } from '../types'
import type { FollowupBadge } from '../hooks/useFollowupBadge'

interface Props {
  profile: Profile | null
  onSignOut: () => void
  followupBadge: FollowupBadge
}

const navItems = [
  {
    to: '/new',
    label: 'New Log',
    adminOnly: false,
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    to: '/logs',
    label: 'Logs',
    adminOnly: false,
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    to: '/followups',
    label: 'Follow-ups',
    adminOnly: false,
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    adminOnly: false,
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    to: '/users',
    label: 'Users',
    adminOnly: true,
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    adminOnly: false,
    icon: (
      <svg className="w-[15px] h-[15px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function Sidebar({ profile, onSignOut, followupBadge }: Props) {
  const roleClass = profile?.role === 'admin' ? 'role-admin' : 'role-frontdesk'
  const isAdmin   = profile?.role === 'admin'

  const urgentCount = followupBadge.overdue + followupBadge.dueToday
  const badgeColor  = followupBadge.overdue > 0
    ? { bg: 'rgba(239,68,68,.18)', text: '#f87171', border: 'rgba(239,68,68,.3)' }
    : { bg: 'rgba(251,191,36,.15)', text: '#fbbf24', border: 'rgba(251,191,36,.3)' }

  return (
    <aside style={{ width: 220, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      {/* Logo */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <img
          src="/agrikonnect-logo.jpg"
          alt="AgriKonnect"
          style={{ width: '100%', borderRadius: 8, display: 'block' }}
        />
        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.12em', color: 'var(--dim)', fontWeight: 600, textAlign: 'center', marginTop: 6 }}>
          Front Desk
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {navItems.filter(item => !item.adminOnly || isAdmin).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }: { isActive: boolean }) =>
              `nav-item${isActive ? ' active' : ''}`
            }
          >
            {item.icon}
            {item.label}
            {item.to === '/followups' && urgentCount > 0 && (
              <span title={`${followupBadge.overdue} overdue · ${followupBadge.dueToday} due today`} style={{
                marginLeft: 'auto',
                fontSize: 10, fontWeight: 700,
                background: badgeColor.bg,
                color: badgeColor.text,
                border: `1px solid ${badgeColor.border}`,
                padding: '1px 6px', borderRadius: 10,
                lineHeight: 1.6,
                minWidth: 18, textAlign: 'center',
              }}>
                {urgentCount > 99 ? '99+' : urgentCount}
              </span>
            )}
            {item.adminOnly && (
              <span style={{ marginLeft: 'auto', fontSize: 8, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', background: 'rgba(139,92,246,.2)', color: '#a78bfa', padding: '1px 5px', borderRadius: 4 }}>
                Admin
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ background: 'rgba(255,255,255,.04)', borderRadius: 8, padding: '9px 11px' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.full_name ?? '—'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
            <span className={`badge ${roleClass === 'role-admin' ? 'badge-partner' : 'badge-resolved'}`} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', padding: '2px 6px', borderRadius: 4 }}>
              {profile?.role ?? '—'}
            </span>
            <button
              onClick={onSignOut}
              style={{ fontSize: 10, color: 'var(--dim)', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
              onMouseOver={e => (e.currentTarget.style.color = 'var(--muted)')}
              onMouseOut={e => (e.currentTarget.style.color = 'var(--dim)')}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
