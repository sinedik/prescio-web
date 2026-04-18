'use client'
import { useEffect, useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase/client'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

const DISMISS_KEY = 'prescio_confirm_email_dismissed_at'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000

export default function EmailConfirmBanner() {
  const { user, loading } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)
  const [dismissed, setDismissed] = useState(true)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    try {
      const ts = Number(localStorage.getItem(DISMISS_KEY) || 0)
      setDismissed(ts > 0 && Date.now() - ts < DISMISS_TTL_MS)
    } catch { setDismissed(false) }
  }, [])

  if (loading || !user || user.email_confirmed_at || !user.email || dismissed) return null

  async function handleResend() {
    if (!user?.email) return
    setSending(true)
    try {
      await supabase.auth.resend({ type: 'signup', email: user.email })
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  function handleDismiss() {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* */ }
    setDismissed(true)
  }

  return (
    <div className="w-full bg-watch/10 border-b border-watch/20 px-4 py-2">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
        <p className="text-[11px] font-mono text-watch flex-1 min-w-0 truncate">
          {sent ? tr('confirm_banner.sent') : tr('confirm_banner.text').replace('{email}', user.email)}
        </p>
        <div className="flex items-center gap-3 shrink-0">
          {!sent && (
            <button
              onClick={handleResend}
              disabled={sending}
              className="text-[11px] font-mono font-bold text-watch hover:text-watch/80 underline underline-offset-2 disabled:opacity-50"
            >
              {sending ? tr('confirm_banner.sending') : tr('confirm_banner.resend')}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-watch/60 hover:text-watch transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
