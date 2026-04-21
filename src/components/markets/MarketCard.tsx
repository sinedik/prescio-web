import type { Market } from '../../types'
import { formatVolume } from '../../utils'
import { normalizeBinary } from '../../lib/probabilities'
import { getMarketStatus } from '../../lib/marketStatus'
import { SourceBadge } from '../feed/SourceBadge'
import { MarketStatusBadge } from './MarketStatusBadge'

interface Props {
  market: Market
  rank: number
  href: string
  isPro?: boolean
  onClick?: () => void
  onAnalyze?: () => void
  analyzing?: boolean
  analyzed?: boolean
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

export default function MarketCard({ market, rank, href, isPro: _isPro, onClick, onAnalyze: _onAnalyze, analyzing, analyzed }: Props) {
  void _isPro; void _onAnalyze
  const normalized = normalizeBinary(market.yesPrice, market.noPrice, `market:${market.platform}:${market.id ?? market.question}`)
  const prob = normalized?.yes ?? null
  const noProb = normalized?.no ?? null

  const edge = market.ai?.edge
  const hasSignal = edge != null && Math.abs(edge) >= 2

  const catKey = market.category?.toUpperCase()
  const catLabel = catKey ? (CATEGORY_LABELS[catKey] ?? catKey.replace(/_/g, ' ').toLowerCase()) : null

  const isResolved = getMarketStatus(market).status === 'resolved'

  return (
    <a
      href={href}
      onClick={(e) => {
        if (!onClick) return
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
        e.preventDefault()
        onClick()
      }}
      aria-label={market.question}
      className={`group relative flex items-stretch gap-3 bg-bg-surface rounded-lg cursor-pointer no-underline
        hover:bg-bg-elevated/60 transition-colors duration-150 animate-slide-up border ${
        analyzed ? 'border-accent/25' : 'border-bg-border'
      } ${isResolved ? 'opacity-50' : ''} px-3.5 py-3`}
      style={{ animationDelay: `${rank * 20}ms`, animationFillMode: 'both' }}
    >
      <div className="shrink-0 w-[44px] flex items-start pt-0.5">
        <SourceBadge source={market.platform.toLowerCase()} size="sm" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1.5">
          <p className="text-[14px] font-medium text-text-primary leading-snug line-clamp-2 flex-1">
            {market.question}
          </p>
          <MarketStatusBadge market={market} size="xs" />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {catLabel && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              {catLabel}
            </span>
          )}
          {catLabel && hasSignal && <span className="text-text-muted/40 text-[10px]">·</span>}
          {hasSignal && (
            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
              edge > 0 ? 'text-accent' : 'text-danger'
            }`}>
              {edge > 0 ? '+' : ''}{Math.round(edge)}pp {edge > 0 ? 'YES' : 'NO'}
            </span>
          )}
          {analyzing && (
            <>
              <span className="text-text-muted/40 text-[10px]">·</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-watch animate-pulse">
                АНАЛИЗ…
              </span>
            </>
          )}
          <span className="text-text-muted/40 text-[10px]">·</span>
          <span className="text-[10px] font-mono text-text-muted">
            VOL <span className="text-text-secondary">{formatVolume(market.volume)}</span>
          </span>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end justify-center min-w-[56px]">
        {prob != null ? (
          <>
            <span className="text-[18px] font-mono font-bold text-accent leading-none">
              {prob}%
            </span>
            {noProb != null && (
              <span className="text-[10px] font-mono text-text-muted mt-0.5">
                NO {noProb}%
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
