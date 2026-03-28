import { useState } from 'react'
import { usePaddle } from '../hooks/usePaddle'
import { useAuthContext } from '../contexts/AuthContext'
import { activatePro } from '../api'

interface Props {
  onClose: () => void
  analysesToday?: number
  analysesLimit?: number
}

const PRO_FEATURES = [
  'Edge score — how mispriced each market is',
  'Fair value estimate — AI probability assessment',
  'Full thesis — why the crowd is wrong',
  'Resolution arbitrage — literal criteria analysis',
  'Kelly sizing — optimal position size',
  'Unlimited analyses per day',
]

export default function PaywallModal({ onClose, analysesToday = 0, analysesLimit = 3 }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user, refreshProfile } = useAuthContext()
  const { openCheckout } = usePaddle(async (transactionId) => {
    try {
      await activatePro(transactionId)
    } catch {
      // webhook may have already handled it
    }
    await refreshProfile()
    onClose()
  })

  const limitReached = analysesToday >= analysesLimit
  const heading = 'Unlock AI Edge Analysis'
  const subtext = limitReached
    ? 'Come back tomorrow or upgrade for unlimited access.'
    : 'See what the market is missing.'

  async function handleUpgrade() {
    setLoading(true)
    setError(null)
    try {
      await openCheckout(user?.email)
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
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-1">UPGRADE TO PRO</p>
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
          {PRO_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
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
          className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
            hover:bg-accent/90 transition-colors disabled:opacity-50 mb-3"
        >
          {loading ? 'LOADING...' : 'Upgrade to Pro → $14.99/month · Cancel anytime'}
        </button>

        <button
          onClick={onClose}
          className="w-full py-2 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          Maybe tomorrow
        </button>
      </div>
    </div>
  )
}
