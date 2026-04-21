'use client'
import type { SportEvent, SportPrediction } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT } from '../../lib/i18n'

interface Props {
  event: SportEvent
  prediction: SportPrediction | null
}

export default function SportMatchResolvedSummary({ event, prediction }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)

  if (event.status !== 'finished') return null
  const hs = event.home_score
  const as = event.away_score
  if (hs == null || as == null) return null

  const raw = (event.raw_data as Record<string, unknown> | null) ?? null
  const htRaw = (raw?.score as { halftime?: { home: number | null; away: number | null } } | null)?.halftime
    ?? (raw?.halftime as { home: number | null; away: number | null } | null)
    ?? null
  const htHome = htRaw?.home ?? null
  const htAway = htRaw?.away ?? null
  const hasHT = htHome != null && htAway != null

  const winner: 'home' | 'away' | 'draw' =
    hs > as ? 'home' : as > hs ? 'away' : 'draw'
  const winnerName =
    winner === 'home' ? event.home_team
      : winner === 'away' ? event.away_team
        : tr('sport_card.draw')

  // Did AI prediction call it correctly?
  const predictedWinner = prediction?.winner_name ?? null
  const aiCorrect = predictedWinner != null && (
    (winner === 'home' && predictedWinner === event.home_team) ||
    (winner === 'away' && predictedWinner === event.away_team)
  )

  return (
    <section
      className="mt-3 rounded-lg p-4"
      style={{
        background: 'rgb(var(--bg-surface))',
        border: '1px solid rgb(var(--bg-border))',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-text-muted">
          {tr('match_detail.resolved.title')}
        </h3>
        {predictedWinner != null && (
          <span
            className={`text-[9px] font-mono font-bold uppercase tracking-[0.12em] px-2 py-[3px] rounded ${
              aiCorrect ? 'text-accent' : 'text-text-muted'
            }`}
            style={{
              background: aiCorrect ? 'rgb(var(--accent) / 0.1)' : 'rgb(var(--bg-elevated))',
              border: `1px solid ${aiCorrect ? 'rgb(var(--accent) / 0.3)' : 'rgb(var(--bg-border))'}`,
            }}
          >
            {aiCorrect
              ? tr('match_detail.resolved.ai_correct')
              : tr('match_detail.resolved.ai_miss')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {tr('match_detail.resolved.winner')}
          </span>
          <span className="text-[14px] font-mono font-bold text-accent truncate">{winnerName}</span>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {tr('match_detail.resolved.final')}
          </span>
          <span className="text-[20px] font-mono font-bold tabular-nums text-text-primary leading-none">
            {hs} : {as}
          </span>
          {hasHT && (
            <span className="text-[10px] font-mono tabular-nums text-text-muted">
              {tr('match_detail.resolved.ht')} {htHome} : {htAway}
            </span>
          )}
        </div>
      </div>

      {prediction?.winner_comment && (
        <p className="text-[11px] font-mono text-text-secondary leading-[1.55] mt-3">
          {prediction.winner_comment}
        </p>
      )}
    </section>
  )
}
