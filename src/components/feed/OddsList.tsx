'use client'
import type { SportOdds } from '../../types/index'

interface Props { odds: SportOdds[]; plan: string }

export function OddsList({ odds, plan }: Props) {
  if (!odds?.length) return null

  const h2h = odds.filter(o => o.market_type === 'h2h')
  const others = odds.filter(o => o.market_type !== 'h2h')
  const sorted = [...h2h, ...others]

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((odd) => (
        <div key={odd.id} className="flex flex-col gap-1">
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {odd.market_type} · {odd.bookmaker}
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {odd.outcomes.map((outcome, i) => (
              <div
                key={i}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-md"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', minWidth: '72px' }}
              >
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                  {outcome.price.toFixed(2)}
                </span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {outcome.name}
                </span>
                {plan !== 'free' && (odd.ai_value?.value_rating ?? 0) > 0.3 && (
                  <span style={{ fontSize: '9px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                    value
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
