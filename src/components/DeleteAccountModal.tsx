'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import { authApi } from '../lib/api'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { useFocusTrap } from '../hooks/useFocusTrap'

interface Props {
  onClose: () => void
}

export default function DeleteAccountModal({ onClose }: Props) {
  const router = useRouter()
  const { user, signOut } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)
  const trapRef = useFocusTrap<HTMLDivElement>(onClose)

  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const email = user?.email ?? ''
  const canDelete = confirm.trim().toLowerCase() === email.toLowerCase() && !deleting

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      await authApi.deleteAccount()
      await signOut()
      router.replace('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--bg-base) / 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !deleting) onClose() }}
    >
      <div ref={trapRef} role="dialog" aria-modal="true" className="w-full max-w-sm bg-bg-surface border border-danger/30 rounded-2xl p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-mono text-danger tracking-wider mb-1">{tr('profile.danger_zone')}</p>
            <h2 className="text-lg font-mono font-bold text-text-primary leading-tight">{tr('profile.delete_account')}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={deleting}
            className="text-text-muted hover:text-text-secondary transition-colors mt-0.5 disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-xs font-mono text-text-secondary mb-4 leading-relaxed">
          {tr('profile.delete_warning')}
        </p>

        <div className="text-[11px] font-mono text-watch bg-watch/5 border border-watch/20 rounded px-3 py-2 mb-4">
          {tr('profile.delete_grace')}
        </div>

        <ul className="text-[11px] font-mono text-text-muted mb-4 space-y-1 list-disc list-inside">
          <li>{tr('profile.delete_bullet_profile')}</li>
          <li>{tr('profile.delete_bullet_watchlist')}</li>
          <li>{tr('profile.delete_bullet_searches')}</li>
          <li>{tr('profile.delete_bullet_sub')}</li>
        </ul>

        <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">
          {tr('profile.delete_confirm_label').replace('{email}', email)}
        </label>
        <input
          type="email"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={email}
          autoComplete="off"
          className="w-full bg-bg-base border border-bg-border rounded px-3 py-2 text-sm font-mono
            text-text-primary placeholder:text-text-muted focus:outline-none focus:border-danger/40
            transition-colors mb-4"
        />

        {error && (
          <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={deleting}
            className="flex-1 py-2.5 border border-bg-border text-text-secondary text-sm font-mono font-bold
              rounded-lg hover:border-text-muted transition-colors disabled:opacity-50"
          >
            {tr('profile.cancel')}
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete}
            className="flex-1 py-2.5 bg-danger text-bg-base text-sm font-mono font-bold
              rounded-lg hover:bg-danger/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleting ? tr('profile.deleting') : tr('profile.delete_permanently')}
          </button>
        </div>
      </div>
    </div>
  )
}
