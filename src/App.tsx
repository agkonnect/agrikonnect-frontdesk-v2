import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './hooks/useAuth'
import { AuthContext } from './hooks/AuthContext'
import AuthPage from './pages/AuthPage'
import Layout from './components/Layout'
import NewLogPage from './pages/NewLogPage'
import TodayPage from './pages/TodayPage'
import FollowupsPage from './pages/FollowupsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import AmbassadorsPage from './pages/AmbassadorsPage'
import SettingsPage from './pages/SettingsPage'
import UsersPage from './pages/UsersPage'
import MatchingPage from './pages/MatchingPage'

const TOAST_STYLE = {
  style: { background: '#18281f', color: '#a7f3d0', border: '1px solid rgba(16,185,129,.3)', fontFamily: 'DM Sans, sans-serif' },
  success: { iconTheme: { primary: '#10b981', secondary: '#a7f3d0' } },
  error: {
    style: { background: '#1f1212', color: '#fca5a5', border: '1px solid rgba(239,68,68,.3)' },
    iconTheme: { primary: '#ef4444', secondary: '#fca5a5' },
  },
}

export default function App() {
  const auth = useAuth()
  const { session, profile, isAdmin, loading, profileError, signOut } = auth

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, border: '2px solid var(--emerald)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
          <p style={{ fontSize: 12, color: 'var(--dim)' }}>Loading…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (!session || profileError) {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={TOAST_STYLE} />
        <AuthPage profileError={profileError} />
      </>
    )
  }

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <Toaster position="bottom-right" toastOptions={TOAST_STYLE} />
        <Routes>
          <Route element={<Layout profile={profile} onSignOut={signOut} />}>
            <Route index element={<Navigate to="/new" replace />} />
            <Route path="/new"       element={<NewLogPage />} />
            <Route path="/logs"       element={<TodayPage isAdmin={isAdmin} />} />
            <Route path="/matching"   element={<MatchingPage />} />
            <Route path="/followups"  element={<FollowupsPage />} />
            <Route path="/analytics"  element={<AnalyticsPage />} />
            <Route path="/users"      element={<UsersPage />} />
            <Route path="/settings"   element={<SettingsPage />} />
            <Route path="/today"      element={<Navigate to="/logs" replace />} />
            <Route path="*"          element={<Navigate to="/new" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
