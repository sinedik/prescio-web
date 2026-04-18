'use client'
import { useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase/client'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  onClose: () => void
}

export default function ChangeEmailModal({ onClose }: Props) {
  const { user } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)
  const trapRef = useFocusTrap<HTMLDivElement>(onClose)
  const currentEmail = user?.email ?? ''

  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setError(tr('email.same'))
      return
    }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    if (error) {
      setError(error.message)
      setSaving(false)
      return
    }
    setSent(true)
    setSaving(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--bg-base) / 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={trapRef} role="dialog" aria-modal="true" className="w-full max-w-sm bg-bg-surface border border-bg-border rounded-2xl p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-1">{tr('profile.account')}</p>
            <h2 className="text-lg font-mono font-bold text-text-primary leading-tight">{tr('email.title')}</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors mt-0.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="flex flex-col gap-4">
            <div className="text-xs font-mono text-accent bg-accent/5 border border-accent/20 rounded px-3 py-3">
              {tr('email.sent_desc').replace('{email}', newEmail)}
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold
                rounded-lg hover:bg-accent/90 transition-colors"
            >
              {tr('email.ok')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">
                {tr('email.current')}
              </label>
              <p className="text-sm font-mono text-text-secondary">{currentEmail}</p>
            </div>

            <div>
              <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">
                {tr('email.new')}
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com"
                className="w-full bg-bg-base border border-bg-border rounded px-3 py-2 text-sm font-mono
                  text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40
                  transition-colors"
              />
            </div>

            <p className="text-[10px] font-mono text-text-muted leading-relaxed">{tr('email.hint')}</p>

            {error && (
              <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex-1 py-2.5 border border-bg-border text-text-secondary text-sm font-mono font-bold
                  rounded-lg hover:border-text-muted transition-colors disabled:opacity-50"
              >
                {tr('profile.cancel')}
              </button>
              <button
                type="submit"
                disabled={saving || !newEmail}
                className="flex-1 py-2.5 bg-accent text-bg-base text-sm font-mono font-bold
                  rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {saving ? tr('profile.saving') : tr('email.send')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
