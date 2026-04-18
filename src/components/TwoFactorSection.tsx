'use client'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import TwoFactorModal from './TwoFactorModal'

export default function TwoFactorSection() {
  const { lang } = useLang()
  const tr = useT(lang)
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors()
    const verified = data?.totp?.find((f) => f.status === 'verified')
    setVerifiedFactorId(verified?.id ?? null)
    setLoading(false)
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  async function handleDisable() {
    if (!verifiedFactorId) return
    if (!window.confirm(tr('mfa.disable_confirm'))) return
    setBusy(true)
    try {
      await supabase.auth.mfa.unenroll({ factorId: verifiedFactorId })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const enabled = !!verifiedFactorId

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-text-primary">{tr('mfa.title')}</p>
          <p className="text-[10px] font-mono text-text-muted mt-0.5">{tr('mfa.desc')}</p>
          <p className={`text-[11px] font-mono mt-1 ${enabled ? 'text-accent' : 'text-text-muted'}`}>
            {loading ? tr('profile.loading') : enabled ? tr('mfa.status_on') : tr('mfa.status_off')}
          </p>
        </div>
        {!loading && (
          enabled ? (
            <button
              onClick={handleDisable}
              disabled={busy}
              className="text-[11px] font-mono font-bold px-3 py-1 rounded border border-bg-border text-text-muted hover:border-danger/40 hover:text-danger transition-colors disabled:opacity-50 shrink-0"
            >
              {busy ? tr('profile.loading') : tr('mfa.disable')}
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="text-[11px] font-mono font-bold px-3 py-1 rounded border border-accent/30 text-accent hover:bg-accent/5 transition-colors shrink-0"
            >
              {tr('mfa.enable')}
            </button>
          )
        )}
      </div>
      {showModal && (
        <TwoFactorModal
          onClose={() => setShowModal(false)}
          onEnrolled={() => { void refresh() }}
        />
      )}
    </>
  )
}
