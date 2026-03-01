import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import type { Profile } from '../types'
import { format } from 'date-fns'

// ── Helpers ─────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name: string) {
  const colors = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  ]
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff
  return colors[Math.abs(hash) % colors.length]
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  const bg = avatarColor(name)
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initials(name)}
    </div>
  )
}

function RoleBadge({ role }: { role: Profile['role'] }) {
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5, fontSize: 10, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '.08em',
      background: role === 'admin' ? 'rgba(139,92,246,.18)' : 'rgba(16,185,129,.14)',
      color: role === 'admin' ? '#a78bfa' : '#6ee7b7',
    }}>
      {role === 'admin' ? 'Admin' : 'Front Desk'}
    </span>
  )
}

// ── Create User Modal ────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void
  onCreated: (p: Profile & { email: string }) => void
}

function CreateUserModal({ onClose, onCreated }: CreateModalProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState<'frontdesk' | 'admin'>('frontdesk')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)

  const submit = async () => {
    if (!fullName.trim()) { toast.error('Full name is required'); return }
    if (!email.trim())    { toast.error('Email is required'); return }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not authenticated')

      const res = await fetch('/.netlify/functions/create-user', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ full_name: fullName.trim(), email: email.trim(), password, role }),
      })

      const body = await res.json()
      if (!res.ok) throw new Error(body.error ?? 'Failed to create user')

      toast.success(`${fullName.trim()} was added successfully`)
      onCreated({
        id:         body.id,
        full_name:  body.full_name,
        email:      body.email,
        role:       body.role,
        is_active:  true,
        created_at: new Date().toISOString(),
      })
      onClose()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 7, padding: '9px 11px', color: 'var(--text)', fontSize: 13,
    fontFamily: 'DM Sans, sans-serif', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, width: '100%', maxWidth: 440, padding: 28, animation: 'popIn .15s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: '#fff', margin: 0 }}>Create New User</h2>
            <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 3 }}>User will be able to sign in immediately</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              style={inputStyle}
              placeholder="e.g. Kofi Mensah"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
              Email Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              style={inputStyle}
              placeholder="e.g. kofi@agrikonnect.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 5 }}>
              Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: 38 }}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--dim)', cursor: 'pointer', padding: 0, display: 'flex' }}
              >
                {showPw ? (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>Ask staff to change this after first sign-in</p>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--dim)', letterSpacing: '.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Role <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {(['frontdesk', 'admin'] as const).map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                    border: role === r ? `1.5px solid ${r === 'admin' ? '#8b5cf6' : 'var(--emerald)'}` : '1.5px solid var(--border)',
                    background: role === r ? (r === 'admin' ? 'rgba(139,92,246,.1)' : 'rgba(16,185,129,.08)') : 'transparent',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, color: role === r ? (r === 'admin' ? '#a78bfa' : '#6ee7b7') : 'var(--muted)' }}>
                    {r === 'admin' ? 'Admin' : 'Front Desk'}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                    {r === 'admin' ? 'Full access + user management' : 'Log contacts, view analytics'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, fontFamily: 'DM Sans, sans-serif' }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={loading}
            style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: 'var(--emerald)', color: '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans, sans-serif', opacity: loading ? .7 : 1 }}
          >
            {loading ? 'Creating…' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

type ProfileWithEmail = Profile & { email?: string }

export default function UsersPage() {
  const { isAdmin } = useAuth()
  const [profiles, setProfiles]     = useState<ProfileWithEmail[]>([])
  const [loading, setLoading]       = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [updating, setUpdating]     = useState<string | null>(null)

  const fetchProfiles = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) toast.error('Failed to load users')
    else setProfiles((data ?? []) as Profile[])
    setLoading(false)
  }, [])

  useEffect(() => { void fetchProfiles() }, [fetchProfiles])

  const updateProfile = async (id: string, patch: Partial<Pick<Profile, 'role' | 'is_active'>>) => {
    setUpdating(id)
    const { error } = await supabase.from('profiles').update(patch).eq('id', id)
    if (error) {
      toast.error(error.message)
    } else {
      setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p))
      toast.success('Updated successfully')
    }
    setUpdating(null)
  }

  const handleCreated = (p: ProfileWithEmail) => {
    setProfiles(prev => [...prev, p])
  }

  // ── Access guard ─────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <div style={{ padding: '0 28px' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Admin Access Only</div>
          <div style={{ fontSize: 13, color: 'var(--dim)' }}>Only administrators can manage user accounts.</div>
        </div>
      </div>
    )
  }

  const activeCount = profiles.filter(p => p.is_active).length
  const adminCount  = profiles.filter(p => p.role === 'admin').length

  return (
    <div style={{ padding: '0 28px' }}>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Total Users',   value: profiles.length },
          { label: 'Active',        value: activeCount },
          { label: 'Administrators',value: adminCount },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 700, color: '#fff' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff' }}>Team Members</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2 }}>Manage user accounts and permissions</div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--emerald)', color: '#fff', border: 'none',
              borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>Loading users…</div>
        ) : profiles.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>No users found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['User', 'Role', 'Status', 'Member Since', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: i < profiles.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* User column */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={p.full_name} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.full_name}</div>
                        {p.email && <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 1 }}>{p.email}</div>}
                      </div>
                    </div>
                  </td>

                  {/* Role column — inline dropdown */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <RoleBadge role={p.role} />
                      <select
                        value={p.role}
                        disabled={updating === p.id}
                        onChange={e => updateProfile(p.id, { role: e.target.value as Profile['role'] })}
                        style={{
                          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
                          color: 'var(--muted)', fontSize: 11, padding: '3px 6px', cursor: 'pointer',
                          fontFamily: 'DM Sans, sans-serif',
                        }}
                      >
                        <option value="frontdesk">Front Desk</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </td>

                  {/* Status column */}
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                      background: p.is_active ? 'rgba(16,185,129,.14)' : 'rgba(239,68,68,.12)',
                      color: p.is_active ? '#6ee7b7' : '#fca5a5',
                    }}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  {/* Joined date */}
                  <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--dim)' }}>
                    {format(new Date(p.created_at), 'd MMM yyyy')}
                  </td>

                  {/* Actions column */}
                  <td style={{ padding: '13px 16px' }}>
                    <button
                      onClick={() => updateProfile(p.id, { is_active: !p.is_active })}
                      disabled={updating === p.id}
                      style={{
                        padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)',
                        background: 'transparent', cursor: updating === p.id ? 'not-allowed' : 'pointer',
                        fontSize: 11, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
                        color: p.is_active ? '#fca5a5' : '#6ee7b7',
                        opacity: updating === p.id ? .5 : 1,
                        transition: 'all .15s',
                      }}
                    >
                      {updating === p.id ? '…' : p.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Note */}
      <div style={{ marginTop: 12, fontSize: 11, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Deactivating a user hides them from the app but does not revoke their login. To fully remove access, delete the user from the Supabase dashboard.
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  )
}
