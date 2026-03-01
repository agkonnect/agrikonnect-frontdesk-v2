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
    if (authErr) {
      setError(authErr.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <img
            src="/agrikonnect-logo.jpg"
            alt="AgriKonnect"
            style={{ width: 220, borderRadius: 12, margin: '0 auto 16px' }}
          />
          <p className="text-sm text-gray-500 mt-1">Front Desk Internal Portal</p>
        </div>

        {/* Profile not found warning */}
        {profileError && (
          <div className="mb-4 p-3 bg-red-900/40 border border-red-700/50 rounded-lg text-sm text-red-300">
            Profile not found for this account. Please contact an admin to set up your profile.
          </div>
        )}

        {/* Sign-in form */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100 mb-6">Sign in</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Need an account? Contact your AgriKonnect admin.
        </p>
      </div>
    </div>
  )
}
