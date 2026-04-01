import { useState } from 'react'
import { usePaddle } from '../hooks/usePaddle'
import { useAuthContext } from '../contexts/AuthContext'
import { api } from '../lib/api'

interface Props {
  onClose: () => void
  variant?: 'pro' | 'alpha'
  analysesToday?: number
  analysesLimit?: number
}

const PRO_FEATURES = [
  'Full thesis & crowd bias',
  'Resolution arbitrage analysis',
  'Unlimited analyses per day',
  'Event context & timeline',
]

const ALPHA_FEATURES = [
  'Edge score on every market',
  'Kelly-optimal position size',
  'Entry/exit timing signals',
  'Instant alerts when edge found',
  'AI accuracy track record',
]

export default function PaywallModal({ onClose, variant = 'pro', analysesToday = 0, analysesLimit = 3 }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, refreshProfile } = useAuthContext()
  const { openCheckout } = usePaddle(async (transactionId) => {
    try {
      await api.activatePro(transactionId)
    } catch {
      // webhook may have already handled it
    }
    await refreshProfile()
    onClose()
  })

  const isAlpha = variant === 'alpha'
  const limitReached = !isAlpha && analysesToday >= analysesLimit

  const heading = isAlpha ? 'Unlock Edge Signals' : 'Unlock AI Analysis'
  const subtext = isAlpha
    ? 'Full edge signals and Kelly sizing on every market.'
    : limitReached
      ? 'Come back tomorrow or upgrade for unlimited access.'
      : 'See what the market is missing.'
  const price = isAlpha ? '$39.99/mo' : '$14.99/mo'
  const ctaLabel = isAlpha ? 'Upgrade to Alpha' : 'Upgrade to Pro'
  const features = isAlpha ? ALPHA_FEATURES : PRO_FEATURES
  const accentCls = isAlpha
    ? 'text-[color:rgb(34_197_94)] border-[rgb(34_197_94/0.3)] bg-[rgb(34_197_94/0.08)]'
    : 'text-accent border-accent/30 bg-accent/10'
  const dotCls = isAlpha ? 'bg-[rgb(34_197_94)]' : 'bg-accent'

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      await openCheckout(user?.email, variant)
      setLoading(false)
    } catch {
      setError('Failed to start checkout. Please try again.')
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
              {isAlpha ? 'UPGRADE TO ALPHA' : 'UPGRADE TO PRO'}
            </p>
            <h2 className="text-lg font-mono font-bold text-text-primary leading-tight">
              {heading}
            </h2>
            <p className="text-xs font-mono text-text-muted mt-1">{subtext}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-secondary transition-colors mt-0.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-2 mb-5">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2.5">
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
              <span className="text-sm font-mono text-text-secondary">{f}</span>
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
          {loading ? 'LOADING...' : `${ctaLabel} — ${price} · Cancel anytime`}
        </button>

        {!isAlpha && (
          <button
            onClick={() => {
              onClose()
              // trigger alpha modal from parent if needed
            }}
            className="w-full py-1.5 text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors"
          >
            Already on Pro? Upgrade to Alpha →
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full py-2 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
