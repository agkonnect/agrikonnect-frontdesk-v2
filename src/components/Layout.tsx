import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import type { Profile } from '../types'

interface Props {
  profile: Profile | null
  onSignOut: () => void
}

const PAGE_META: Record<string, { title: string; sub: string }> = {
  '/new':        { title: 'New Log',     sub: 'Record a new contact interaction' },
  '/logs':       { title: 'Logs',        sub: 'Browse and filter contact logs by date' },
  '/followups':  { title: 'Follow-ups',  sub: 'Track and action pending follow-ups' },
  '/analytics':  { title: 'Analytics',   sub: 'Performance overview and trends' },
  '/users':      { title: 'Users',       sub: 'Manage team accounts and permissions' },
  '/settings':   { title: 'Settings',    sub: 'Your account details' },
}

export default function Layout({ profile, onSignOut }: Props) {
  const location = useLocation()
  const meta = PAGE_META[location.pathname] ?? { title: 'AgriKonnect', sub: '' }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar profile={profile} onSignOut={onSignOut} />

      <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg)' }}>
        {/* Page header */}
        <div style={{
          padding: '24px 28px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 20,
        }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-.4px' }}>
              {meta.title}
            </h1>
            <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{meta.sub}</p>
          </div>

          <GlobalSearch />
        </div>

        <div style={{ paddingBottom: 40 }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
