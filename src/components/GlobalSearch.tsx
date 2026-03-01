import { useState, useEffect, useRef, useContext, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../hooks/AuthContext'
import LogDetailPanel from './LogDetailPanel'
import type { DailyLog, DailyLogWithProfiles } from '../types'
import {
  contactTypeBadge,
  CONTACT_TYPE_LABELS,
} from '../types'

function toWithProfiles(log: DailyLog): DailyLogWithProfiles {
  return { ...log, creator: null, assignee: null }
}

export default function GlobalSearch() {
  const { user, isAdmin } = useContext(AuthContext)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<DailyLog[]>([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const [selected, setSelected] = useState<DailyLogWithProfiles | null>(null)
  const [activeIdx, setActiveIdx] = useState(-1)

  const inputRef    = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Keyboard shortcut: Ctrl+K / Cmd+K ─────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Close on outside click ─────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Debounced search ───────────────────────────────────────
  const search = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) {
      setResults([])
      setOpen(false)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .or(`phone.ilike.%${trimmed}%,contact_name.ilike.%${trimmed}%,crop.ilike.%${trimmed}%`)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error) {
      setResults((data ?? []) as unknown as DailyLog[])
      setOpen(true)
    }
    setLoading(false)
    setActiveIdx(-1)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(val), 280)
  }

  // ── Keyboard navigation in dropdown ───────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault()
      pickResult(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const pickResult = (log: DailyLog) => {
    setSelected(toWithProfiles(log))
    setOpen(false)
    setQuery('')
    setResults([])
  }

  const handleUpdate = async (id: string, updates: { notes?: string; outcome?: string }) => {
    const { data, error } = await supabase
      .from('daily_logs')
      .update(updates as Record<string, unknown>)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    const updated = toWithProfiles(data as unknown as DailyLog)
    setSelected(updated)
    return updated
  }

  const highlight = (text: string, q: string) => {
    if (!q.trim()) return text
    const idx = text.toLowerCase().indexOf(q.toLowerCase().trim())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark style={{ background: 'rgba(16,185,129,.25)', color: 'var(--em-light)', borderRadius: 2 }}>
          {text.slice(idx, idx + q.trim().length)}
        </mark>
        {text.slice(idx + q.trim().length)}
      </>
    )
  }

  return (
    <>
      {/* ── Search bar ── */}
      <div style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)',
          border: `1px solid ${open ? 'var(--emerald)' : 'var(--border)'}`,
          borderRadius: 9,
          padding: '7px 12px',
          width: 300,
          transition: 'border-color .15s, box-shadow .15s',
          boxShadow: open ? '0 0 0 3px rgba(16,185,129,.1)' : 'none',
        }}>
          {/* Search icon */}
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}
            style={{ color: loading ? 'var(--emerald)' : 'var(--dim)', flexShrink: 0, transition: 'color .15s' }}>
            {loading
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              : <><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" /></>
            }
          </svg>

          <input
            ref={inputRef}
            type="text"
            placeholder="Search phone, name, crop…"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (results.length > 0) setOpen(true) }}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text)', fontFamily: 'DM Sans, sans-serif',
            }}
          />

          {/* Keyboard hint */}
          {!query && (
            <kbd style={{
              fontSize: 9, color: 'var(--dim)', background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 4,
              padding: '1px 5px', fontFamily: 'JetBrains Mono, monospace',
              flexShrink: 0, whiteSpace: 'nowrap',
            }}>
              Ctrl K
            </kbd>
          )}

          {/* Clear button */}
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setOpen(false); inputRef.current?.focus() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--dim)', padding: 0, display: 'flex', lineHeight: 1 }}
            >
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Dropdown ── */}
        {open && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              width: 400,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              boxShadow: '0 16px 40px rgba(0,0,0,.5)',
              zIndex: 200,
              overflow: 'hidden',
              animation: 'popIn .15s ease-out',
            }}
          >
            <style>{`@keyframes popIn { from { transform:scale(.97);opacity:0 } to { transform:scale(1);opacity:1 } }`}</style>

            {results.length === 0 ? (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--dim)', fontSize: 12 }}>
                No results for <strong style={{ color: 'var(--muted)' }}>"{query}"</strong>
              </div>
            ) : (
              <>
                <div style={{ padding: '7px 14px 5px', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--dim)', borderBottom: '1px solid var(--border)' }}>
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </div>

                {results.map((log, i) => (
                  <button
                    key={log.id}
                    onClick={() => pickResult(log)}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      width: '100%', padding: '10px 14px',
                      background: i === activeIdx ? 'rgba(255,255,255,.04)' : 'transparent',
                      border: 'none', borderBottom: i < results.length - 1 ? '1px solid rgba(63,63,70,.4)' : 'none',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                      transition: 'background .1s',
                    }}
                  >
                    {/* Left: type badge + name + phone */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span className={contactTypeBadge(log.contact_type)} style={{ flexShrink: 0 }}>
                          {CONTACT_TYPE_LABELS[log.contact_type]}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {log.contact_name ? highlight(log.contact_name, query) : <span style={{ color: 'var(--dim)' }}>—</span>}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--muted)' }}>
                          {highlight(log.phone, query)}
                        </span>
                        {log.crop && (
                          <span style={{ fontSize: 11, color: 'var(--dim)' }}>
                            · {highlight(log.crop, query)}{log.quantity ? `, ${log.quantity}` : ''}
                          </span>
                        )}
                        {log.region && (
                          <span style={{ fontSize: 11, color: 'var(--dim)' }}>· {log.region}</span>
                        )}
                      </div>
                    </div>

                    {/* Right: date */}
                    <div style={{ fontSize: 10, color: 'var(--dim)', flexShrink: 0, paddingTop: 2, fontFamily: 'JetBrains Mono, monospace' }}>
                      {format(new Date(log.created_at), 'dd MMM')}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Detail panel (rendered outside the search box to avoid stacking context issues) ── */}
      {selected && (
        <LogDetailPanel
          log={selected}
          isAdmin={isAdmin}
          currentUserId={user?.id ?? ''}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}
    </>
  )
}
