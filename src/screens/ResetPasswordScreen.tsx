'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase/client'
import Logo from '../components/Logo'

const MIN_LEN = 8

export default function ResetPasswordScreen() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (data.session) {
        setReady(true)
        return
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setReady(true)
      })

      setTimeout(() => {
        if (!cancelled) {
          supabase.auth.getSession().then(({ data }) => {
            if (!cancelled && !data.session) setInvalidLink(true)
          })
        }
      }, 1500)

      return () => sub.subscription.unsubscribe()
    }

    init()
    return () => { cancelled = true }
  }, [])

  const tooShort = password.length > 0 && password.length < MIN_LEN
  const mismatch = confirm.length > 0 && confirm !== password
  const canSubmit = password.length >= MIN_LEN && password === confirm && !saving

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    const { authApi } = await import('../lib/api')
    authApi.markHasPassword().catch(() => {})
    setDone(true)
    setTimeout(() => router.replace('/markets'), 1500)
  }

  if (invalidLink) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8"><Logo size={26} textSize={18} /></div>
          <h1 className="text-lg font-mono font-bold text-text-primary mb-2">Link expired</h1>
          <p className="text-xs font-mono text-text-muted mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="block w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded text-center
              hover:bg-accent/90 transition-colors"
          >
            Request new link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8"><Logo size={26} textSize={18} /></div>
        <h1 className="text-lg font-mono font-bold text-text-primary mb-1">Set new password</h1>
        <p className="text-xs font-mono text-text-muted mb-6">
          Choose a password you haven&apos;t used before. Minimum {MIN_LEN} characters.
        </p>

        {!ready ? (
          <p className="text-sm font-mono text-text-muted animate-pulse">Verifying link...</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">NEW PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                autoFocus
                className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-sm font-mono
                  text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
              {tooShort && <p className="text-[10px] font-mono text-danger mt-1">Minimum {MIN_LEN} characters</p>}
            </div>

            <div>
              <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">CONFIRM PASSWORD</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-sm font-mono
                  text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
              />
              {mismatch && <p className="text-[10px] font-mono text-danger mt-1">Passwords do not match</p>}
            </div>

            {error && (
              <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            {done && (
              <div className="text-xs font-mono text-accent bg-accent/5 border border-accent/20 rounded px-3 py-2">
                Password updated. Redirecting...
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded
                hover:bg-accent/90 transition-colors disabled:opacity-40"
            >
              {saving ? 'Saving...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
