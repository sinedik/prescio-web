import type { Market } from '../../types'
import { formatVolume, daysUntil } from '../../utils'
import { SourceBadge } from '../feed/SourceBadge'

interface Props {
  markets: Market[]
  rank: number
  onClick?: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  GEOPOLITICS: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
  CRYPTO: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
  ELECTIONS: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
  US_POLITICS: 'text-red-400 border-red-400/30 bg-red-400/5',
  POLICY: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5',
  ESPORTS: 'text-green-400 border-green-400/30 bg-green-400/5',
  POLITICS: 'text-red-400 border-red-400/30 bg-red-400/5',
  ECONOMICS: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5',
  SCIENCE_TECH: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
}

function formatResolution(date: string | undefined, days: number | null): string {
  if (!date || days === null) return ''
  if (days <= 0) return 'Resolves today'
  if (days === 1) return 'Resolves tomorrow'
  if (days < 30) return `Resolves in ${days}d`
  return `Resolves ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export default function EventCard({ markets, rank, onClick }: Props) {
  const ev = markets[0]?.event
  if (!ev) return null

  const platform = markets[0]?.platform ?? ''
  const category = markets[0]?.category
  const totalVolume = ev.total_volume ?? markets.reduce((sum, m) => sum + (m.volume ?? 0), 0)
  const realOutcomeCount = ev.tradable_count ?? ev.market_count ?? markets.length
  const signals = markets.filter(m => m.ai?.edge != null && Math.abs(m.ai.edge) >= 2)
  const bestSignal = signals.reduce<{ edge: number } | null>((best, m) => {
    const e = m.ai?.edge ?? 0
    if (!best || Math.abs(e) > Math.abs(best.edge)) return { edge: e }
    return best
  }, null)
  const nearestResolve = markets
    .map(m => m.resolutionDate)
    .filter(Boolean)
    .sort()[0]
  const days = nearestResolve ? daysUntil(nearestResolve) : null

  const sorted = [...markets].sort((a, b) => (b.yesPrice ?? 0) - (a.yesPrice ?? 0))
  const visible = sorted.slice(0, 4)
  const hidden = Math.max(0, realOutcomeCount - visible.length)

  const catStyle = category ? (CATEGORY_COLORS[category.toUpperCase()] ?? 'text-text-muted border-bg-border bg-bg-surface') : ''
  const showImage = ev.enrichment_status === 'ready' && !!ev.image_url

  return (
    <div
      onClick={onClick}
      className="group relative bg-bg-surface rounded-lg overflow-hidden cursor-pointer
        hover:bg-bg-elevated/60 transition-all duration-200 animate-slide-up border border-bg-border"
      style={{ animationDelay: `${rank * 30}ms`, animationFillMode: 'both' }}
    >
      {showImage && (
        <div className="w-full h-28 overflow-hidden">
          <img src={ev.image_url!} alt={ev.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <SourceBadge source={platform.toLowerCase()} />
          {category && (
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${catStyle}`}>
              {category.replace('_', ' ')}
            </span>
          )}
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-bg-border bg-bg-elevated text-text-secondary uppercase tracking-wider">
            {realOutcomeCount} outcomes
          </span>
          {bestSignal && (
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
              bestSignal.edge > 0
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-danger/40 bg-danger/10 text-danger'
            }`}>
              {signals.length > 1 ? `${signals.length} signals · ` : ''}
              {bestSignal.edge > 0 ? '+' : ''}{Math.round(bestSignal.edge)}pp
            </span>
          )}
        </div>

        <p className="text-[14px] font-semibold text-text-primary leading-snug mb-3 line-clamp-2">
          {ev.title}
        </p>

        <div className="flex flex-col gap-1 mb-3">
          {visible.map(m => {
            const prob = m.yesPrice != null ? (m.yesPrice > 1 ? m.yesPrice : m.yesPrice * 100) : null
            const edge = m.ai?.edge
            const hasSignal = edge != null && Math.abs(edge) >= 2
            return (
              <div key={m.id} className="flex items-center justify-between text-[12px] font-mono gap-3">
                <span className="text-text-secondary truncate flex items-center gap-1.5 min-w-0">
                  <span className="truncate">{m.outcome_label || m.question}</span>
                  {hasSignal && (
                    <span className={`text-[9px] font-bold px-1 py-0.5 rounded shrink-0 ${
                      edge > 0 ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'
                    }`}>
                      {edge > 0 ? '+' : ''}{Math.round(edge)}pp
                    </span>
                  )}
                </span>
                {prob != null && (
                  <span className="text-accent font-bold shrink-0">{Math.round(prob)}%</span>
                )}
              </div>
            )
          })}
          {hidden > 0 && (
            <div className="text-[11px] font-mono text-text-muted">+{hidden} more outcomes</div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-mono text-text-muted">
            VOL <span className="text-text-secondary">{formatVolume(totalVolume)}</span>
          </span>
          {days !== null && (
            <>
              <span className="text-text-muted/50 text-[11px]">·</span>
              <span className="text-[11px] font-mono text-text-muted">
                {formatResolution(nearestResolve, days)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
