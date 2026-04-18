'use client'
import { useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { getPaddlePortalAction } from '../actions/paddle'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

export default function PaymentIssueBanner() {
  const { profile, loading } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)
  const [opening, setOpening] = useState(false)

  if (loading || !profile) return null
  const status = profile.subscription_status
  if (status !== 'past_due' && status !== 'paused') return null

  async function handleManage() {
    setOpening(true)
    try {
      const { url } = await getPaddlePortalAction()
      window.location.href = url
    } catch {
      setOpening(false)
    }
  }

  const key = status === 'past_due' ? 'payment.past_due' : 'payment.paused'

  return (
    <div className="w-full bg-danger/10 border-b border-danger/20 px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <p className="text-[11px] font-mono text-danger flex-1 min-w-0">
          {tr(key)}
        </p>
        <button
          onClick={handleManage}
          disabled={opening}
          className="text-[11px] font-mono font-bold text-danger hover:text-danger/80 underline underline-offset-2 disabled:opacity-50 shrink-0"
        >
          {opening ? tr('profile.loading') : tr('payment.fix')}
        </button>
      </div>
    </div>
  )
}
