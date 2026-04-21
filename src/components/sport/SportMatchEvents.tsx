'use client'
import type { SportMatchEvent } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT } from '../../lib/i18n'

interface Props {
  events: SportMatchEvent[]
  homeTeamId: number | null
  awayTeamId: number | null
}

function iconFor(type: string, detail: string): string {
  const t = type.toLowerCase()
  const d = detail.toLowerCase()
  if (t === 'goal') return d.includes('own') ? '⚽ OG' : '⚽'
  if (t === 'card') return d.includes('red') ? '🟥' : '🟨'
  if (t === 'subst') return '⇄'
  if (t === 'var') return 'VAR'
  return '•'
}

export default function SportMatchEvents({ events, homeTeamId, awayTeamId }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)

  if (!events || events.length === 0) return null

  const sorted = [...events].sort((a, b) => {
    const am = (a.minute ?? 0) + (a.extra ?? 0) / 100
    const bm = (b.minute ?? 0) + (b.extra ?? 0) / 100
    return am - bm
  })

  return (
    <section
      className="mt-3 rounded-lg p-4"
      style={{
        background: 'rgb(var(--bg-surface))',
        border: '1px solid rgb(var(--bg-border))',
      }}
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted mb-3">
        {tr('match_detail.events.title')}
      </h3>
      <div className="flex flex-col gap-1.5">
        {sorted.map((ev, i) => {
          const isHome = ev.team_id != null && homeTeamId != null && ev.team_id === homeTeamId
          const isAway = ev.team_id != null && awayTeamId != null && ev.team_id === awayTeamId
          const minute = ev.minute != null ? `${ev.minute}${ev.extra ? `+${ev.extra}` : ''}'` : '—'
          const icon = iconFor(ev.type, ev.detail)
          const playerLine = ev.player ?? ev.detail
          const subLine = ev.assist ? `↗ ${ev.assist}` : ev.type === 'subst' ? ev.detail : null
          return (
            <div
              key={`${minute}-${i}`}
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: '1fr 44px 36px 1fr' }}
            >
              {/* Home side */}
              <div className="text-right text-[11px] font-mono text-text-secondary truncate">
                {isHome ? (
                  <>
                    <span className="text-text-primary">{playerLine}</span>
                    {subLine && (
                      <span className="block text-[9px] text-text-muted">{subLine}</span>
                    )}
                  </>
                ) : null}
              </div>
              {/* Minute */}
              <div className="text-center text-[10px] font-mono tabular-nums text-text-muted">
                {minute}
              </div>
              {/* Icon */}
              <div className="text-center text-[13px] font-mono">{icon}</div>
              {/* Away side */}
              <div className="text-left text-[11px] font-mono text-text-secondary truncate">
                {isAway ? (
                  <>
                    <span className="text-text-primary">{playerLine}</span>
                    {subLine && (
                      <span className="block text-[9px] text-text-muted">{subLine}</span>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
