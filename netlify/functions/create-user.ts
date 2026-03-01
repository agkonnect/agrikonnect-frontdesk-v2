import { createClient } from '@supabase/supabase-js'
import type { Handler } from '@netlify/functions'

const SUPABASE_URL       = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY
const SERVICE_ROLE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type':                 'application/json',
}

function json(statusCode: number, body: object) {
  return { statusCode, headers: cors, body: JSON.stringify(body) }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' }
  if (event.httpMethod !== 'POST')   return json(405, { error: 'Method not allowed' })

  // Guard: ensure required env vars are present
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SERVICE_ROLE_KEY) {
    const missing = [
      !SUPABASE_URL        && 'SUPABASE_URL',
      !SUPABASE_ANON_KEY   && 'SUPABASE_ANON_KEY',
      !SERVICE_ROLE_KEY    && 'SUPABASE_SERVICE_ROLE_KEY',
    ].filter(Boolean).join(', ')
    return json(500, { error: `Server misconfiguration — missing env vars: ${missing}` })
  }

  // ── 1. Verify caller is an admin ──────────────────────────────────────────
  const authHeader = event.headers['authorization'] ?? ''
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Missing auth token' })

  const jwt = authHeader.slice(7)
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  const { data: callerProfile, error: callerError } = await callerClient
    .from('profiles')
    .select('role')
    .single()

  if (callerError || callerProfile?.role !== 'admin') {
    return json(403, { error: 'Admin access required' })
  }

  // ── 2. Parse and validate body ────────────────────────────────────────────
  let body: { full_name?: string; email?: string; password?: string; role?: string }
  try { body = JSON.parse(event.body ?? '{}') } catch { return json(400, { error: 'Invalid JSON' }) }

  const { full_name, email, password, role } = body
  if (!full_name?.trim()) return json(400, { error: 'Full name is required' })
  if (!email?.trim())     return json(400, { error: 'Email is required' })
  if (!password)          return json(400, { error: 'Password is required' })
  if (password.length < 8)return json(400, { error: 'Password must be at least 8 characters' })
  if (!['admin', 'frontdesk'].includes(role ?? '')) return json(400, { error: 'Role must be admin or frontdesk' })

  // ── 3. Create auth user with service-role key ─────────────────────────────
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email:         email.trim(),
    password,
    email_confirm: true,   // skip verification email for internal users
  })

  if (authError) return json(400, { error: authError.message })

  // ── 4. Insert profile row ─────────────────────────────────────────────────
  const { error: profileError } = await adminClient
    .from('profiles')
    .insert({ id: authData.user.id, full_name: full_name.trim(), role, is_active: true })

  if (profileError) {
    // Roll back: delete the orphaned auth user
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return json(400, { error: profileError.message })
  }

  return json(200, {
    id:        authData.user.id,
    email:     authData.user.email,
    full_name: full_name.trim(),
    role,
  })
}
