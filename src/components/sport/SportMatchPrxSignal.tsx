'use client'
import type { SportEvent } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT } from '../../lib/i18n'
import { hasPrx, formatPrx, PRX_THRESHOLD } from '../../lib/prx'
import { useSubscriptionTier } from '../../hooks/useSubscriptionTier'
import { PrxLockedFooter } from '../markets/prx/PrxLockedFooter'

interface Props {
  event: SportEvent
}

// Graceful-degrade: returns null until backend ships SportEvent.ai.edge
// (see TODO.md entry 3). Once populated, renders a compact signal card with
// edge/confidence/fair-prob numbers + optional factor chips + reasoning.
export default function SportMatchPrxSignal({ event }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  const tier = useSubscriptionTier()
  const isFree = tier === 'free'

  const ai = event.ai
  if (!ai || !hasPrx(ai.edge)) return null

  const edge = ai.edge as number
  const edgeSide: 'home' | 'away' = edge > 0 ? 'home' : 'away'
  const teamName = edgeSide === 'home' ? event.home_team : event.away_team

  if (isFree) {
    return (
      <section
        className="mt-3 px-4 py-4 rounded-lg"
        style={{
          background: 'rgb(var(--bg-surface))',
          border: '1px solid rgb(var(--bg-border))',
          borderLeftWidth: 2,
          borderLeftColor: 'rgb(var(--accent))',
        }}
      >
        <PrxLockedFooter />
      </section>
    )
  }

  return (
    <section
      className="mt-3 px-4 py-4 rounded-lg"
      style={{
        background: 'rgb(var(--accent) / 0.04)',
        border: '1px solid rgb(var(--accent) / 0.3)',
        borderLeftWidth: 2,
        borderLeftColor: 'rgb(var(--accent))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-accent">
            {tr('card.prx_detected')}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted">
            · {teamName}
          </span>
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-text-muted">
          ≥ {PRX_THRESHOLD}pp
        </span>
      </div>

      {/* Numbers row: edge / confidence / fair prob */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div
          className="flex flex-col items-center gap-1 py-2 rounded"
          style={{ background: 'rgb(var(--accent) / 0.06)', border: '1px solid rgb(var(--accent) / 0.2)' }}
        >
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted leading-none">
            {tr('match_detail.prx.edge')}
          </span>
          <span className="text-[18px] font-mono font-bold tabular-nums text-accent leading-none">
            {formatPrx(edge)}pp
          </span>
        </div>

        <div
          className="flex flex-col items-center gap-1 py-2 rounded"
          style={{ background: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--bg-border))' }}
        >
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted leading-none">
            {tr('match_detail.prx.confidence')}
          </span>
          <span className="text-[18px] font-mono font-bold tabular-nums text-text-primary leading-none">
            {ai.confidence != null ? `${Math.round(ai.confidence * 100)}%` : '—'}
          </span>
        </div>

        <div
          className="flex flex-col items-center gap-1 py-2 rounded"
          style={{ background: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--bg-border))' }}
        >
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted leading-none">
            {tr('match_detail.prx.fair_prob')}
          </span>
          <span className="text-[18px] font-mono font-bold tabular-nums text-text-primary leading-none">
            {ai.fairProb != null ? `${Math.round(ai.fairProb * 100)}%` : '—'}
          </span>
        </div>
      </div>

      {/* Factor chips (optional) */}
      {ai.factors && ai.factors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {ai.factors.map((f) => (
            <span
              key={f}
              className="inline-flex items-center px-2 py-0.5 rounded font-mono uppercase tracking-[0.08em] text-[9px] text-text-secondary"
              style={{
                background: 'rgb(var(--bg-surface))',
                border: '1px solid rgb(var(--bg-border))',
              }}
            >
              {f.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      )}

      {/* Reasoning (optional) */}
      {ai.reasoning && (
        <p className="text-[11px] font-mono leading-[1.55] text-text-secondary">
          {ai.reasoning}
        </p>
      )}
    </section>
  )
}
