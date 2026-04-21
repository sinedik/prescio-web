'use client'
import type { Market } from '../../types'
import type { CSSProperties } from 'react'
import { formatVolume } from '../../utils'
import { normalizeBinary } from '../../lib/probabilities'
import { getMarketStatus } from '../../lib/marketStatus'
import { SourceBadge } from '../feed/SourceBadge'
import { MarketStatusBadge } from './MarketStatusBadge'
import { useLang } from '../../contexts/LanguageContext'
import { useT, type Lang } from '../../lib/i18n'

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

function formatMetaDate(iso: string | undefined, lang: Lang): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d
    .toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })
    .replace('.', '')
    .toUpperCase()
}

function Sparkline({ points }: { points: { t: number; p: number }[] }) {
  if (points.length < 2) return null
  const W = 72
  const H = 32
  const PAD = 2
  const ys = points.map((p) => p.p)
  const min = Math.min(...ys)
  const max = Math.max(...ys)
  const range = max - min || 1
  const lastIdx = points.length - 1
  const path = points
    .map((pt, i) => {
      const x = PAD + (i / lastIdx) * (W - 2 * PAD)
      const y = PAD + (1 - (pt.p - min) / range) * (H - 2 * PAD)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
  const delta = points[lastIdx].p - points[0].p
  const stroke =
    delta > 1 ? 'rgb(var(--alpha))' : delta < -1 ? 'rgb(var(--danger))' : 'rgb(var(--text-muted))'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" className="shrink-0">
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeOpacity={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function MarketCard({
  market,
  rank,
  href,
  isPro: _isPro,
  onClick,
  onAnalyze: _onAnalyze,
  analyzing,
  analyzed,
}: Props) {
  void _isPro
  void _onAnalyze
  const { lang } = useLang()
  const tr = useT(lang)

  const normalized = normalizeBinary(
    market.yesPrice,
    market.noPrice,
    `market:${market.platform}:${market.id ?? market.question}`
  )
  const yes = normalized?.yes ?? null
  const no = normalized?.no ?? null

  const fairProb = market.ai?.fairProb ?? null
  const edge = market.ai?.edge ?? null
  const hasEdge = edge != null && Math.abs(edge) >= 2 && fairProb != null

  const { status } = getMarketStatus(market)
  const isResolved = status === 'resolved'

  const yesNormalizedPrice =
    market.yesPrice != null ? (market.yesPrice > 1 ? market.yesPrice / 100 : market.yesPrice) : null
  const resolvedOutcome: 'yes' | 'no' | null = !isResolved
    ? null
    : yesNormalizedPrice === 1
      ? 'yes'
      : yesNormalizedPrice === 0
        ? 'no'
        : null

  const catKey = market.category?.toUpperCase()
  const catLabel = catKey
    ? (CATEGORY_LABELS[catKey] ?? catKey.replace(/_/g, ' ').toLowerCase())
    : null

  const subtitle =
    market.event?.title && market.event.title !== market.question ? market.event.title : null
  const metaText = !isResolved ? formatMetaDate(market.resolutionDate, lang) : null
  const sparkData =
    !isResolved && market.price_history && market.price_history.length >= 2
      ? market.price_history
      : null

  const borderColor = analyzed ? 'rgb(var(--accent) / 0.25)' : 'rgb(var(--bg-border))'
  const cardStyle: CSSProperties = {
    animationDelay: `${rank * 20}ms`,
    animationFillMode: 'both',
    padding: '20px 24px',
    paddingLeft: hasEdge ? '22px' : '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor,
    borderLeftWidth: hasEdge ? '2px' : '1px',
    borderLeftColor: hasEdge ? 'rgb(var(--accent))' : borderColor,
    outlineColor: 'rgb(var(--accent))',
    transition: 'background-color 120ms ease, border-color 120ms ease',
    opacity: isResolved ? 0.75 : undefined,
  }

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
      className="group relative block no-underline bg-bg-surface rounded-lg cursor-pointer animate-slide-up
        hover:bg-bg-elevated/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={cardStyle}
    >
      {/* Row 1: source/category  ·  status/meta */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <SourceBadge source={market.platform.toLowerCase()} size="sm" />
          {catLabel && (
            <>
              <span className="text-text-muted/50 text-[10px] font-mono">·</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted truncate">
                {catLabel}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MarketStatusBadge market={market} size="sm" showCountdown={false} />
          {analyzing ? (
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.1em] text-watch animate-pulse">
              {tr('market_card.analyzing')}
            </span>
          ) : metaText ? (
            <span className="text-[11px] font-mono tabular-nums uppercase tracking-[0.08em] text-text-muted">
              {metaText}
            </span>
          ) : null}
        </div>
      </div>

      {/* Row 2: title */}
      <h3
        className="mt-3 text-[16px] font-medium text-text-primary leading-[1.4] line-clamp-2"
        style={
          isResolved
            ? { textDecoration: 'line-through', textDecorationColor: 'rgb(var(--bg-border))' }
            : undefined
        }
      >
        {market.question}
      </h3>

      {/* Row 3: subtitle */}
      {subtitle && (
        <p className="mt-1 text-[12px] text-text-muted leading-snug line-clamp-1">{subtitle}</p>
      )}

      {/* Row 4 */}
      {isResolved ? (
        resolvedOutcome ? (
          <div
            className="mt-3 text-[12px] font-mono font-bold uppercase tracking-[0.12em]"
            style={{
              color:
                resolvedOutcome === 'yes' ? 'rgb(var(--alpha))' : 'rgb(var(--danger))',
            }}
          >
            {tr(
              resolvedOutcome === 'yes'
                ? 'market_card.resolved_yes'
                : 'market_card.resolved_no'
            )}
          </div>
        ) : null
      ) : yes != null ? (
        <div className="mt-3 flex items-baseline gap-5 flex-wrap">
          <ProbCol label={tr('market_card.yes')} value={`${yes}%`} tone="primary" />
          {no != null && (
            <ProbCol label={tr('market_card.no')} value={`${no}%`} tone="secondary" />
          )}
          {hasEdge && (
            <ProbCol
              label={tr('market_card.ai_fair')}
              value={`${Math.round(fairProb!)}%`}
              tone="primary"
              labelAccent
            />
          )}
          {hasEdge && (
            <span
              className="inline-flex items-baseline gap-1.5 self-center"
              style={{
                border: '1px solid rgb(var(--accent))',
                background: 'rgba(var(--accent-rgb), 0.08)',
                padding: '6px 10px',
                borderRadius: 3,
              }}
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-accent leading-none">
                {tr('market_card.edge')}
              </span>
              <span className="text-[15px] font-mono font-bold tabular-nums text-accent leading-none">
                {edge! > 0 ? '+' : ''}
                {Math.round(edge!)}pp
              </span>
            </span>
          )}
          <div className="ml-auto flex items-baseline gap-3">
            <ProbCol
              label={tr('market_card.volume')}
              value={formatVolume(market.volume)}
              tone="small"
            />
            {sparkData && <Sparkline points={sparkData} />}
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-baseline gap-5">
          <span className="text-[22px] font-mono text-text-muted leading-none">—</span>
          <div className="ml-auto flex items-baseline gap-3">
            <ProbCol
              label={tr('market_card.volume')}
              value={formatVolume(market.volume)}
              tone="small"
            />
          </div>
        </div>
      )}
    </a>
  )
}

function ProbCol({
  label,
  value,
  tone,
  labelAccent,
}: {
  label: string
  value: string
  tone: 'primary' | 'secondary' | 'small'
  labelAccent?: boolean
}) {
  const valueCls =
    tone === 'primary'
      ? 'text-[22px] font-mono font-bold tabular-nums leading-none text-text-primary'
      : tone === 'secondary'
        ? 'text-[22px] font-mono font-bold tabular-nums leading-none text-text-secondary'
        : 'text-[15px] font-mono font-bold tabular-nums leading-none text-text-secondary'
  const labelCls = `text-[10px] font-mono uppercase tracking-[0.1em] leading-none ${
    labelAccent ? 'text-accent' : 'text-text-muted'
  }`
  return (
    <span className="inline-flex flex-col gap-1.5">
      <span className={labelCls}>{label}</span>
      <span className={valueCls}>{value}</span>
    </span>
  )
}
