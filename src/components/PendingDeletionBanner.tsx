'use client'
import { useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { authApi } from '../lib/api'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

const GRACE_DAYS = 30

export default function PendingDeletionBanner() {
  const { profile, loading, refreshProfile } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)
  const [restoring, setRestoring] = useState(false)

  if (loading || !profile?.deleted_at) return null

  const deletedAt = new Date(profile.deleted_at)
  const purgeAt = new Date(deletedAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000)
  const daysLeft = Math.max(0, Math.ceil((purgeAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))

  async function handleRestore() {
    setRestoring(true)
    try {
      await authApi.restoreAccount()
      await refreshProfile()
    } finally {
      setRestoring(false)
    }
  }

  return (
    <div className="w-full bg-danger/10 border-b border-danger/20 px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <p className="text-[11px] font-mono text-danger flex-1 min-w-0">
          {tr('pending_delete.text').replace('{days}', String(daysLeft))}
        </p>
        <button
          onClick={handleRestore}
          disabled={restoring}
          className="text-[11px] font-mono font-bold text-danger hover:text-danger/80 underline underline-offset-2 disabled:opacity-50 shrink-0"
        >
          {restoring ? tr('profile.loading') : tr('pending_delete.restore')}
        </button>
      </div>
    </div>
  )
}
