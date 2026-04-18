'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

interface Props {
  onClose: () => void
}

const MIN_LEN = 8

export default function ChangePasswordModal({ onClose }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const tooShort = password.length > 0 && password.length < MIN_LEN
  const mismatch = confirm.length > 0 && confirm !== password
  const canSubmit = password.length >= MIN_LEN && password === confirm && !saving

  async function handleSubmit() {
    setSaving(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    setDone(true)
    setSaving(false)
    setTimeout(onClose, 1200)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--bg-base) / 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <div className="w-full max-w-sm bg-bg-surface border border-bg-border rounded-2xl p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-1">{tr('profile.security')}</p>
            <h2 className="text-lg font-mono font-bold text-text-primary leading-tight">{tr('profile.change_password')}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-text-muted hover:text-text-secondary transition-colors mt-0.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">
              {tr('profile.new_password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-bg-base border border-bg-border rounded px-3 py-2 text-sm font-mono
                text-text-primary focus:outline-none focus:border-accent/40 transition-colors"
            />
            {tooShort && (
              <p className="text-[10px] font-mono text-danger mt-1">{tr('profile.password_too_short')}</p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">
              {tr('profile.confirm_password')}
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-bg-base border border-bg-border rounded px-3 py-2 text-sm font-mono
                text-text-primary focus:outline-none focus:border-accent/40 transition-colors"
            />
            {mismatch && (
              <p className="text-[10px] font-mono text-danger mt-1">{tr('profile.password_mismatch')}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {done && (
          <div className="text-xs font-mono text-accent bg-accent/5 border border-accent/20 rounded px-3 py-2 mb-3">
            {tr('profile.password_updated')}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 border border-bg-border text-text-secondary text-sm font-mono font-bold
              rounded-lg hover:border-text-muted transition-colors disabled:opacity-50"
          >
            {tr('profile.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 bg-accent text-bg-base text-sm font-mono font-bold
              rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? tr('profile.saving') : tr('profile.update_password')}
          </button>
        </div>
      </div>
    </div>
  )
}
