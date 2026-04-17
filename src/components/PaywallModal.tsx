'use client'
import { useState } from 'react'
import { usePaddle } from '../hooks/usePaddle'
import { useAuthContext } from '../contexts/AuthContext'
import { activateProAction } from '../actions/paddle'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

interface Props {
  onClose: () => void
  variant?: 'pro' | 'alpha'
  analysesToday?: number
  analysesLimit?: number
}

export default function PaywallModal({ onClose, variant = 'pro', analysesToday = 0, analysesLimit = 3 }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, refreshProfile } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)
  const { openCheckout } = usePaddle(async (transactionId) => {
    try {
      await activateProAction(transactionId)
    } catch {
      // webhook may have already handled it
    }
    await refreshProfile()
    onClose()
  })

  const isAlpha = variant === 'alpha'
  const limitReached = !isAlpha && analysesToday >= analysesLimit

  const heading = isAlpha ? tr('paywall.unlock_edge') : tr('paywall.unlock_ai')
  const subtext = isAlpha
    ? tr('paywall.edge_desc')
    : limitReached
      ? tr('paywall.limit_desc')
      : tr('paywall.see_what')
  const price = isAlpha ? '$39.99/mo' : '$14.99/mo'
  const ctaLabel = isAlpha ? tr('paywall.cta') : tr('paywall.pro_cta').replace(' — $15/mo', '')
  const featureKeys = isAlpha
    ? (['paywall.f_alpha_1', 'paywall.f_alpha_2', 'paywall.f_alpha_3', 'paywall.f_alpha_4', 'paywall.f_alpha_5'] as const)
    : (['paywall.f_pro_1', 'paywall.f_pro_2', 'paywall.f_pro_3', 'paywall.f_pro_4'] as const)

  const accentCls = isAlpha
    ? 'text-[color:rgb(34_197_94)] border-[rgb(34_197_94/0.3)] bg-[rgb(34_197_94/0.08)]'
    : 'text-accent border-accent/30 bg-accent/10'

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      await openCheckout(user?.email, variant)
      setLoading(false)
    } catch {
      setError(tr('paywall.checkout_error'))
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--bg-base) / 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-bg-surface border border-bg-border rounded-2xl p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-1">
              {isAlpha ? tr('paywall.upgrade_to_alpha') : tr('paywall.upgrade_to_pro')}
            </p>
            <h2 className="text-lg font-mono font-bold text-text-primary leading-tight">{heading}</h2>
            <p className="text-xs font-mono text-text-muted mt-1">{subtext}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors mt-0.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-2 mb-5">
          {featureKeys.map((key) => (
            <div key={key} className="flex items-center gap-2.5">
              <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${accentCls}`}>
                {isAlpha ? (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13 2L4.5 13H11l-2 9 8.5-11H11.5l1.5-9z" />
                  </svg>
                ) : (
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm font-mono text-text-secondary">{tr(key)}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className={`w-full py-3 text-bg-base text-sm font-mono font-bold rounded-lg transition-colors disabled:opacity-50 mb-3 ${
            isAlpha
              ? 'bg-[rgb(34_197_94)] hover:bg-[rgb(34_197_94/0.9)]'
              : 'bg-accent hover:bg-accent/90'
          }`}
        >
          {loading ? tr('paywall.loading') : `${ctaLabel} — ${price} · ${tr('paywall.cancel_any')}`}
        </button>

        {!isAlpha && (
          <button
            onClick={onClose}
            className="w-full py-1.5 text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors"
          >
            {tr('paywall.already_pro')}
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          {tr('paywall.maybe_later')}
        </button>
      </div>
    </div>
  )
}
