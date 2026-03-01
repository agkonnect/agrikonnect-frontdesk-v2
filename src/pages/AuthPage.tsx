import React, { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  profileError: boolean
}

export default function AuthPage({ profileError }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
    if (authErr) setError(authErr.message)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(16,185,129,.10) 0%, transparent 70%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <img
            src="/agrikonnect-logo-white.jpg"
            alt="AgriKonnect"
            style={{
              width: '88%',
              maxWidth: 320,
              borderRadius: 16,
              display: 'block',
              margin: '0 auto',
              boxShadow: '0 0 40px rgba(16,185,129,.12)',
            }}
          />
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--text)',
            letterSpacing: '-.5px',
            margin: 0,
          }}>
            Welcome back
          </h1>
          <p style={{ fontSize: 13, color: 'var(--dim)', marginTop: 6 }}>
            Sign in to the Front Desk Portal
          </p>
        </div>

        {/* Profile not found warning */}
        {profileError && (
          <div style={{
            marginBottom: 16,
            padding: '12px 16px',
            background: 'rgba(239,68,68,.1)',
            border: '1px solid rgba(239,68,68,.25)',
            borderRadius: 10,
            fontSize: 13,
            color: '#fca5a5',
          }}>
            Profile not found for this account. Please contact an admin to set up your profile.
          </div>
        )}

        {/* Sign-in card */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '32px 28px',
          boxShadow: '0 4px 32px rgba(0,0,0,.4)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <label className="form-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@agrikonnect.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
              />
            </div>

            <div>
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239,68,68,.1)',
                border: '1px solid rgba(239,68,68,.2)',
                borderRadius: 8,
                fontSize: 13,
                color: '#fca5a5',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: loading ? 'rgba(16,185,129,.5)' : 'var(--emerald)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background .15s',
                letterSpacing: '.01em',
              }}
              onMouseOver={e => { if (!loading) e.currentTarget.style.background = '#059669' }}
              onMouseOut={e => { if (!loading) e.currentTarget.style.background = 'var(--emerald)' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--dim)',
          marginTop: 24,
        }}>
          Need an account?{' '}
          <span style={{ color: 'var(--muted)' }}>Contact your AgriKonnect admin.</span>
        </p>
      </div>
    </div>
  )
}
