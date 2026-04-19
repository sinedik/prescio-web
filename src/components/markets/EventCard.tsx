import type { Market } from '../../types'
import { formatVolume, daysUntil } from '../../utils'
import { SourceBadge } from '../feed/SourceBadge'

interface Props {
  markets: Market[]
  rank: number
  href: string
  onClick?: () => void
}

function resolutionBadge(date: string | undefined, days: number | null) {
  if (!date || days === null) return null
  if (days <= 0) return { label: 'СЕГОДНЯ', tone: 'danger' as const }
  if (days <= 7) return { label: `${days}Д`, tone: 'warning' as const }
  const d = new Date(date)
  return {
    label: d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase(),
    tone: 'muted' as const,
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  POLITICS: 'Политика',
  US_POLITICS: 'Политика США',
  GEOPOLITICS: 'Геополитика',
  ELECTIONS: 'Выборы',
  POLICY: 'Политика',
  SPORT: 'Спорт',
  SPORTS: 'Спорт',
  CRYPTO: 'Крипто',
  ESPORTS: 'Киберспорт',
  ECONOMICS: 'Экономика',
  SCIENCE_TECH: 'Наука',
}

export default function EventCard({ markets, rank, href, onClick }: Props) {
  const ev = markets[0]?.event
  if (!ev) return null

  const platform = markets[0]?.platform ?? ''
  const category = markets[0]?.category
  const totalVolume = ev.total_volume ?? markets.reduce((sum, m) => sum + (m.volume ?? 0), 0)
  const outcomeCount = ev.tradable_count ?? ev.market_count ?? markets.length

  const signals = markets.filter(m => m.ai?.edge != null && Math.abs(m.ai.edge) >= 2)
  const bestSignal = signals.reduce<{ edge: number } | null>((best, m) => {
    const e = m.ai?.edge ?? 0
    if (!best || Math.abs(e) > Math.abs(best.edge)) return { edge: e }
    return best
  }, null)

  const leader = [...markets].sort((a, b) => (b.yesPrice ?? 0) - (a.yesPrice ?? 0))[0]
  const leaderProb = leader?.yesPrice != null
    ? (leader.yesPrice > 1 ? leader.yesPrice : leader.yesPrice * 100)
    : null
  const leaderLabel = leader?.outcome_label ?? null

  const nearestResolve = markets.map(m => m.resolutionDate).filter(Boolean).sort()[0]
  const days = nearestResolve ? daysUntil(nearestResolve) : null
  const resBadge = resolutionBadge(nearestResolve, days)

  const catKey = category?.toUpperCase()
  const catLabel = catKey ? (CATEGORY_LABELS[catKey] ?? catKey.replace(/_/g, ' ').toLowerCase()) : null

  return (
    <a
      href={href}
      onClick={(e) => {
        if (!onClick) return
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
        e.preventDefault()
        onClick()
      }}
      aria-label={ev.title}
      className="group relative flex items-stretch gap-3 bg-bg-surface rounded-lg cursor-pointer no-underline
        hover:bg-bg-elevated/60 transition-colors duration-150 animate-slide-up border border-bg-border
        px-3.5 py-3"
      style={{ animationDelay: `${rank * 20}ms`, animationFillMode: 'both' }}
    >
      <div className="shrink-0 w-[44px] flex items-start pt-0.5">
        <SourceBadge source={platform.toLowerCase()} size="sm" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-text-primary leading-snug line-clamp-2 mb-1.5">
          {ev.title}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {catLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              {catLabel}
            </span>
          )}
          {bestSignal && catLabel && <span className="text-text-muted/40 text-[10px]">·</span>}
          {bestSignal && (
            <>
              <span className="text-text-muted/40 text-[10px]">·</span>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                bestSignal.edge > 0 ? 'text-accent' : 'text-danger'
              }`}>
                {signals.length > 1 ? `${signals.length} сигналов · ` : ''}
                {bestSignal.edge > 0 ? '+' : ''}{Math.round(bestSignal.edge)}pp
              </span>
            </>
          )}
          {(catLabel || bestSignal) && <span className="text-text-muted/40 text-[10px]">·</span>}
          <span className="text-[10px] font-mono text-text-muted">
            VOL <span className="text-text-secondary">{formatVolume(totalVolume)}</span>
          </span>
          {resBadge && (
            <>
              <span className="text-text-muted/40 text-[10px]">·</span>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                resBadge.tone === 'danger' ? 'text-danger'
                : resBadge.tone === 'warning' ? 'text-watch'
                : 'text-text-muted'
              }`}>
                {resBadge.tone !== 'muted' ? 'РЕЗОЛВ ' : ''}{resBadge.label}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end justify-center min-w-[80px] max-w-[140px]">
        {leaderProb != null ? (
          <>
            {leaderLabel && (
              <span className="text-[10px] font-mono text-text-secondary mb-0.5 truncate max-w-full">
                {leaderLabel.length > 12 ? `${leaderLabel.slice(0, 12)}…` : leaderLabel}
              </span>
            )}
            <span className="text-[18px] font-mono font-bold text-accent leading-none">
              {Math.round(leaderProb)}%
            </span>
            {outcomeCount > 1 && (
              <span className="text-[9px] font-mono text-text-muted mt-0.5">
                {outcomeCount} outcomes
              </span>
            )}
          </>
        ) : (
          <span className="text-[11px] font-mono text-text-muted">—</span>
        )}
      </div>
    </a>
  )
}
