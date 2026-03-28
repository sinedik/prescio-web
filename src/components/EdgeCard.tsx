import { useNavigate } from 'react-router-dom'
import type { MarketOpportunity } from '../types'
import { formatEdge, formatProb, formatVolume, platformColor, edgeColor, actionColor } from '../utils'
import { IconLock } from './icons'

function slugify(question: string): string {
  return question
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60)
    .replace(/(^-|-$)/g, '')
}

interface Props {
  item: MarketOpportunity
  rank: number
  isPro?: boolean
  onPaywall?: () => void
}

export default function EdgeCard({ item, rank, isPro = true, onPaywall }: Props) {
  const navigate = useNavigate()
  const { market, analysis } = item
  const absEdge = Math.abs(analysis.edge)

  const confScore =
    typeof analysis.confidenceScore === 'number'
      ? analysis.confidenceScore
      : analysis.confidence === 'high' ? 75
      : analysis.confidence === 'medium' ? 50
      : 25

  const confBarColor =
    confScore >= 70 ? 'bg-accent' :
    confScore >= 40 ? 'bg-watch' :
    'bg-text-muted'

  return (
    <div
      onClick={() => navigate(`/market/${slugify(market.question)}`, { state: { item } })}
      className="group relative bg-bg-surface border border-bg-border rounded-lg p-5 cursor-pointer
        hover:border-accent/20 hover:bg-bg-elevated/60
        transition-all duration-200 animate-slide-up"
      style={{ animationDelay: `${rank * 40}ms`, animationFillMode: 'both' }}
    >
      {/* Left accent bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-lg transition-all duration-200 group-hover:w-[3px] ${
          absEdge >= 10 ? 'bg-accent' : absEdge >= 5 ? 'bg-watch' : 'bg-text-muted/30'
        }`}
      />

      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className="shrink-0 w-7 text-right mt-1">
          <span className="font-mono text-xs text-text-muted">#{rank + 1}</span>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header badges */}
          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${platformColor(market.platform)}`}>
              {market.platform}
            </span>
            {isPro && (
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider ${actionColor(analysis.action)}`}>
                {analysis.action ?? analysis.edgeDirection}
              </span>
            )}
            {analysis.category && analysis.category !== 'OTHER' && (
              <span className="text-[10px] font-mono text-text-muted border border-bg-border px-1.5 py-0.5 rounded uppercase tracking-wider">
                {analysis.category}
              </span>
            )}
            {analysis.horizon && (
              <span className="text-[10px] font-mono text-text-muted/70">
                ~{analysis.horizon}
              </span>
            )}
          </div>

          {/* Question */}
          <p className="text-[15px] font-medium text-text-primary leading-snug mb-3 line-clamp-2 transition-colors">
            {market.question}
          </p>

          {/* Stats row */}
          <div className="flex items-center gap-4 text-[11px] font-mono uppercase tracking-wide">
            <div>
              <span className="text-text-muted">Edge </span>
              <span className={`font-bold text-[13px] ${edgeColor(analysis.edge)}`}>
                {formatEdge(analysis.edge)}
              </span>
            </div>
            <div>
              <span className="text-text-muted">Mkt </span>
              <span className="text-text-secondary">{formatProb(analysis.marketProb)}</span>
              <span className="text-text-muted mx-1">→</span>
              <span className="text-text-primary font-semibold">{formatProb(analysis.fairProb)}</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-text-muted">Vol </span>
              <span className="text-text-secondary">{formatVolume(market.volume)}</span>
            </div>
            <div className="hidden md:flex items-center gap-1.5">
              <span className="text-text-muted">Conf </span>
              <div className="w-16 h-1 bg-bg-border rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${confBarColor}`} style={{ width: `${confScore}%` }} />
              </div>
              <span className="text-text-secondary text-[10px]">{confScore}%</span>
            </div>
          </div>
        </div>

        {/* Edge badge */}
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          {isPro ? (
            <>
              <div
                className={`w-[70px] h-[70px] rounded-xl flex flex-col items-center justify-center border transition-all duration-200 ${
                  absEdge >= 10
                    ? 'border-accent/40 bg-accent/5 group-hover:border-accent/60 group-hover:bg-accent/10'
                    : absEdge >= 5
                    ? 'border-watch/35 bg-watch/5'
                    : 'border-bg-border bg-bg-elevated'
                }`}
              >
                <span className={`text-[22px] font-mono font-bold leading-none ${edgeColor(analysis.edge)}`}>
                  {absEdge >= 10 ? '+' : ''}{Math.round(absEdge)}
                </span>
                <span className="text-[9px] font-mono text-text-muted mt-1 tracking-wider">PP</span>
              </div>
              <div className="w-[70px] h-1 bg-bg-border rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${confBarColor}`} style={{ width: `${confScore}%` }} />
              </div>
            </>
          ) : (
            <div className="relative group/lock">
              <button
                onClick={(e) => { e.stopPropagation(); onPaywall?.() }}
                className="w-[70px] h-[70px] rounded-xl flex flex-col items-center justify-center border
                  border-bg-border bg-bg-elevated hover:border-text-muted/30 transition-colors"
              >
                <IconLock size={20} color="var(--text-muted)" />
                <span className="text-[9px] font-mono text-text-muted mt-1 tracking-wider">EDGE</span>
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 text-center
                text-[10px] font-mono bg-bg-elevated border border-bg-border rounded px-2 py-1.5
                opacity-0 group-hover/lock:opacity-100 transition-opacity pointer-events-none z-10 whitespace-normal">
                Upgrade to Pro to see edge analysis
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Thesis preview — Pro only */}
      {isPro && analysis.thesis && (
        <div className="mt-3.5 pt-3 border-t border-bg-border/60">
          <p className="text-[13px] text-text-muted leading-relaxed line-clamp-2">
            {analysis.thesis}
          </p>
        </div>
      )}
    </div>
  )
}
