import type { Market } from '../../types'
import { formatVolume, formatDate, daysUntil } from '../../utils'
import { IconLock } from '../icons'
import { SourceBadge } from '../feed/SourceBadge'

interface Props {
  market: Market
  rank: number
  isPro?: boolean
  onClick?: () => void
  onAnalyze?: () => void
  analyzing?: boolean
  analyzed?: boolean
}

// Deterministic mock sparkline ending at current price
function genSparkline(seed: string, price: number): number[] {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const p = price > 1 ? price : price * 100
  const startOffset = (((Math.abs(h) & 0xf) - 8) * 0.7)
  const pts: number[] = []
  let cur = Math.max(1, Math.min(99, p + startOffset))
  for (let i = 0; i < 6; i++) {
    h = (h * 1664525 + 1013904223) | 0
    const jitter = ((Math.abs(h) % 100) / 100 - 0.5) * 3
    cur = Math.max(1, Math.min(99, cur + (p - cur) * 0.35 + jitter))
    pts.push(cur)
  }
  pts.push(p)
  return pts
}

function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const W = 52, H = 22
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const toX = (i: number) => (i / (data.length - 1)) * W
  const toY = (v: number) => H - 2 - ((v - min) / range) * (H - 4)
  const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const color = up ? 'rgb(var(--accent))' : 'rgb(var(--danger))'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.85" />
      <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1])} r="2" fill={color} />
    </svg>
  )
}

function formatResolution(date: string | undefined, days: number | null): string {
  if (!date) return ''
  if (days === null) return ''
  if (days <= 0) return 'Resolves today'
  return `Resolves ${new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export default function MarketCard({ market, rank, isPro, onClick, onAnalyze, analyzing, analyzed }: Props) {
  const prob = market.yesPrice != null
    ? (market.yesPrice > 1 ? market.yesPrice : market.yesPrice * 100)
    : null
  const noProb = market.noPrice != null
    ? (market.noPrice > 1 ? market.noPrice : market.noPrice * 100)
    : prob != null ? (100 - prob) : null

  const days = market.resolutionDate ? daysUntil(market.resolutionDate) : null
  const sparkData = prob != null ? genSparkline(market.question, prob) : null
  const sparkUp = sparkData ? sparkData[sparkData.length - 1] >= sparkData[0] : true

  const CATEGORY_COLORS: Record<string, string> = {
    GEOPOLITICS: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
    CRYPTO: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    ELECTIONS: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    US_POLITICS: 'text-red-400 border-red-400/30 bg-red-400/5',
    POLICY: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/5',
    ESPORTS: 'text-green-400 border-green-400/30 bg-green-400/5',
  }
  const catStyle = market.category ? (CATEGORY_COLORS[market.category.toUpperCase()] ?? 'text-text-muted border-bg-border bg-bg-surface') : ''

  const ev = market.event
  const showImage = ev?.enrichment_status === 'ready' && !!ev.image_url

  return (
    <div
      onClick={onClick}
      className={`group relative bg-bg-surface rounded-lg overflow-hidden cursor-pointer
        hover:bg-bg-elevated/60 transition-all duration-200 animate-slide-up border ${
        analyzed ? 'border-accent/25 bg-accent/[0.02]' : 'border-bg-border'
      }`}
      style={{ animationDelay: `${rank * 30}ms`, animationFillMode: 'both' }}
    >
      {/* Event image / skeleton */}
      {ev && (
        showImage ? (
          <div className="w-full h-28 overflow-hidden">
            <img src={ev.image_url!} alt={ev.title} className="w-full h-full object-cover" />
          </div>
        ) : ev.enrichment_status === 'pending' ? (
          <div className="w-full h-28 bg-bg-elevated animate-pulse" />
        ) : null
      )}

      <div className="px-4 py-3.5">
      {/* Row 1: platform badge + category + sparkline */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <SourceBadge source={market.platform.toLowerCase()} />
          {market.category && (
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${catStyle}`}>
              {market.category.replace('_', ' ')}
            </span>
          )}
          {analyzing && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-watch/40 bg-watch/10 text-watch animate-pulse">
              ANALYZING
            </span>
          )}
        </div>
        {sparkData && <Sparkline data={sparkData} up={sparkUp} />}
      </div>

      {/* Row 2: question */}
      <p className="text-[14px] font-medium text-text-primary leading-snug mb-2.5 line-clamp-2 transition-colors">
        {market.question}
      </p>

      {/* Row 3: YES/NO prices + stats */}
      <div className="flex items-center gap-3 flex-wrap">
        {prob != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-mono font-bold text-accent">YES {Math.round(prob)}%</span>
            {noProb != null && (
              <span className="text-[11px] font-mono text-text-muted">/ NO {Math.round(noProb)}%</span>
            )}
          </div>
        )}
        <span className="text-text-muted/50 text-[11px]">·</span>
        <span className="text-[11px] font-mono text-text-muted">
          VOL <span className="text-text-secondary">{formatVolume(market.volume)}</span>
        </span>
        {days !== null && (
          <>
            <span className="text-text-muted/50 text-[11px]">·</span>
            <span className="text-[11px] font-mono text-text-muted">
              {formatResolution(market.resolutionDate, days)}
            </span>
          </>
        )}
        <div className="flex items-center gap-2 ml-auto">
          {onAnalyze && (
            <button
              onClick={(e) => { e.stopPropagation(); onAnalyze() }}
              className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                isPro
                  ? 'border-accent/30 text-accent hover:bg-accent/10'
                  : 'border-bg-border text-text-muted hover:border-text-muted/40 hover:text-text-secondary'
              }`}
            >
              {isPro ? 'Analyze →' : <span className="flex items-center gap-1"><IconLock size={12} color="var(--text-muted)" /> Analyze</span>}
            </button>
          )}
          <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[10px] font-mono text-text-muted hover:text-accent transition-colors hidden sm:block"
          >
            ↗
          </a>
        </div>
      </div>
      </div>
    </div>
  )
}
