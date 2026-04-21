'use client'
import type { CSSProperties } from 'react'
import type { Market } from '../../types'
import { formatVolume } from '../../utils'
import { normalizeOutcomeProbabilities } from '../../lib/probabilities'
import { getMarketStatus, type MarketStatus, type MarketStatusInput } from '../../lib/marketStatus'
import { SourceBadge } from '../feed/SourceBadge'
import { MarketStatusBadge } from './MarketStatusBadge'
import { useLang } from '../../contexts/LanguageContext'
import { useT, type Lang } from '../../lib/i18n'

interface Props {
  markets: Market[]
  rank: number
  href: string
  onClick?: () => void
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

const TOP_N = 3
const EDGE_THRESHOLD = 2

interface Outcome {
  name: string
  rawProb: number
  prob: number
  edge: number | null
  aiFair: number | null
  isResolved: boolean
  isWinner: boolean
  isLoser: boolean
  entry: number | null
  market: Market
}

const STATUS_PRIORITY: Record<MarketStatus, number> = {
  resolved: 0,
  cancelled: 1,
  live: 2,
  resolving: 3,
  upcoming: 4,
}

function formatEventDate(iso: string | undefined | null, lang: Lang): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d
    .toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })
    .replace('.', '')
    .toUpperCase()
}

function formatFinalDate(iso: string | undefined | null, lang: Lang): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return null
  return d
    .toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', year: 'numeric' })
    .replace('.', '')
    .toUpperCase()
}

export default function PredictionEventCard({ markets, rank, href, onClick }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)

  if (!markets || markets.length === 0) return null
  const ev = markets[0]?.event
  if (!ev) return null

  const platform = markets[0].platform
  const category = markets[0].category

  const normalized = normalizeOutcomeProbabilities(
    markets,
    m => m.yesPrice,
    `prediction-event:${ev.id}`,
  )

  const allOutcomes: Outcome[] = normalized.map(({ outcome: m, normalizedPct }) => {
    const { status } = getMarketStatus(m)
    const isResolved = status === 'resolved'
    const isWinner = isResolved && Math.round(normalizedPct) >= 99
    const isLoser = isResolved && Math.round(normalizedPct) <= 1
    const entry = m.price_history && m.price_history.length > 0 ? m.price_history[0].p : null
    return {
      name: m.outcome_label ?? m.question,
      rawProb: m.yesPrice,
      prob: normalizedPct,
      edge: m.ai?.edge ?? null,
      aiFair: m.ai?.fairProb ?? null,
      isResolved,
      isWinner,
      isLoser,
      entry,
      market: m,
    }
  })

  // aggregateStatus: resolved(all) > cancelled(any) > live(any) > resolving(any) > upcoming
  const statuses = allOutcomes.map(o => getMarketStatus(o.market).status)
  const allResolved = statuses.every(s => s === 'resolved')
  const aggregateStatus: MarketStatus = allResolved
    ? 'resolved'
    : (statuses
        .filter(s => s !== 'resolved')
        .sort((a, b) => STATUS_PRIORITY[a] - STATUS_PRIORITY[b])[0] ?? 'upcoming')
  const isAggregateResolved = aggregateStatus === 'resolved'

  // Sort: resolved winners first (for resolved view), otherwise by prob desc
  const sortedOutcomes = [...allOutcomes].sort((a, b) => {
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1
    return b.prob - a.prob
  })

  // Edge detection
  const edgeCandidates = sortedOutcomes
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.edge != null && Math.abs(o.edge) >= EDGE_THRESHOLD)
    .sort((a, b) => Math.abs(b.o.edge!) - Math.abs(a.o.edge!))
  const edgeOutcome = edgeCandidates[0]?.o ?? null
  const hasEdge = edgeOutcome != null

  // Build top rows: if edge outcome is not in top-N, promote it (displace last)
  let topOutcomes = sortedOutcomes.slice(0, TOP_N)
  if (hasEdge && !topOutcomes.includes(edgeOutcome)) {
    topOutcomes = [...topOutcomes.slice(0, TOP_N - 1), edgeOutcome]
  }
  // Binary case (2 outcomes): show both, no collapse
  const isBinary = allOutcomes.length === 2
  if (isBinary) {
    topOutcomes = sortedOutcomes
  }

  const hiddenOutcomes = sortedOutcomes.filter(o => !topOutcomes.includes(o))
  const hiddenCount = hiddenOutcomes.length
  const hiddenSumPct = hiddenOutcomes.reduce((s, o) => s + o.prob, 0)

  const totalVolume = ev.total_volume ?? markets.reduce((s, m) => s + (m.volume ?? 0), 0)
  const totalVolume24h = markets.reduce<number | null>((acc, m) => {
    if (m.volume24h == null) return acc
    return (acc ?? 0) + m.volume24h
  }, null)

  const catKey = category?.toUpperCase()
  const catLabel = catKey ? (CATEGORY_LABELS[catKey] ?? catKey.replace(/_/g, ' ').toLowerCase()) : null
  const outcomesCount = ev.tradable_count ?? ev.market_count ?? allOutcomes.length

  const metaDate = isAggregateResolved
    ? formatFinalDate(markets[0].resolutionDate, lang)
    : formatEventDate(markets[0].resolutionDate, lang)

  // Representative market for status badge (matches aggregateStatus)
  const statusMarket: MarketStatusInput =
    markets.find(m => getMarketStatus(m).status === aggregateStatus) ?? markets[0]

  const footerRender = renderFooter({
    hasEdge,
    edgeOutcome,
    totalVolume,
    totalVolume24h,
    isAggregateResolved,
    metaFinalDate: isAggregateResolved ? formatFinalDate(markets[0].resolutionDate, lang) : null,
    tr,
  })

  const borderColor = hasEdge ? 'rgb(var(--accent))' : 'rgb(var(--bg-border))'
  const cardStyle: CSSProperties = {
    animationDelay: `${rank * 20}ms`,
    animationFillMode: 'both',
    padding: '20px 24px',
    paddingLeft: hasEdge ? '22px' : '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgb(var(--bg-border))',
    borderLeftWidth: hasEdge ? '2px' : '1px',
    borderLeftColor: borderColor,
    transition: 'background-color 120ms ease, border-color 120ms ease',
    opacity: isAggregateResolved ? 0.75 : undefined,
  }

  const resolvedWinner = isAggregateResolved ? sortedOutcomes.find(o => o.isWinner) ?? null : null
  const resolvedRest = isAggregateResolved ? sortedOutcomes.filter(o => !o.isWinner) : []

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
      className="group relative block no-underline bg-bg-surface rounded-lg cursor-pointer animate-slide-up
        hover:bg-bg-elevated/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={cardStyle}
    >
      {/* Row 1: metadata */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <SourceBadge source={platform.toLowerCase()} size="sm" />
          {catLabel && (
            <>
              <span className="text-text-muted/50 text-[10px] font-mono">·</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted truncate">
                {catLabel}
              </span>
            </>
          )}
          <span className="text-text-muted/50 text-[10px] font-mono">·</span>
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted tabular-nums">
            {outcomesCount} {tr('prediction_event_card.outcomes_count')}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MarketStatusBadge market={statusMarket} size="sm" showCountdown={false} />
          {metaDate && (
            <span className="text-[11px] font-mono tabular-nums uppercase tracking-[0.08em] text-text-muted">
              {metaDate}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: event title */}
      <h3
        className="text-[16px] font-medium text-text-primary leading-[1.4] line-clamp-2 mb-4"
        style={
          isAggregateResolved
            ? { textDecoration: 'line-through', textDecorationColor: 'rgb(var(--bg-border))' }
            : undefined
        }
      >
        {ev.title}
      </h3>

      {/* Row 3: outcome rows OR resolved winner */}
      {isAggregateResolved && resolvedWinner ? (
        <div className="mb-1">
          <ResolvedWinnerRow outcome={resolvedWinner} tr={tr} />
          {resolvedRest.length > 0 && (
            <div className="mt-2 pl-[calc(14px+8px)]">
              <span className="text-[11px] font-mono text-text-muted/70 italic">
                +{resolvedRest.length} {tr('prediction_event_card.resolved_outcomes')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-3 flex flex-col gap-2">
          {topOutcomes.map((o, idx) => (
            <OutcomeRow
              key={o.market.id ?? o.market.question + idx}
              outcome={o}
              rank={idx}
              isEdgeRow={hasEdge && o === edgeOutcome}
              cardHasEdge={hasEdge}
            />
          ))}
          {hiddenCount > 0 && !isBinary && (
            <MoreOutcomesRow count={hiddenCount} sumPct={hiddenSumPct} tr={tr} />
          )}
        </div>
      )}

      {/* Row 4: footer */}
      {footerRender && (
        <div
          className="flex justify-between items-center pt-3"
          style={{ borderTop: '1px solid rgb(var(--bg-border))' }}
        >
          {footerRender}
        </div>
      )}
    </a>
  )
}

function OutcomeRow({
  outcome,
  rank,
  isEdgeRow,
  cardHasEdge,
}: {
  outcome: Outcome
  rank: number
  isEdgeRow: boolean
  cardHasEdge: boolean
}) {
  const barFill = rank === 0 ? 'rgb(var(--text-primary))' : rank === 1 ? 'rgb(var(--text-secondary))' : 'rgb(var(--text-muted))'
  const nameCls =
    rank === 0 ? 'text-text-primary' : 'text-text-secondary'
  const probCls =
    rank === 0 ? 'text-text-primary' : 'text-text-secondary'

  const prob = Math.round(outcome.prob)
  const aiFair = outcome.aiFair != null ? Math.round(outcome.aiFair) : null
  const edge = outcome.edge ?? 0
  const showGhost = isEdgeRow && aiFair != null && edge > 0
  const edgeIsNegative = isEdgeRow && edge < 0

  const rowStyle: CSSProperties = isEdgeRow
    ? {
        background: 'rgba(var(--accent-rgb), 0.08)',
        borderRadius: 3,
        padding: '6px 8px',
        margin: '0 -8px',
      }
    : {}

  return (
    <div className="flex items-center gap-3" style={rowStyle}>
      <span
        className="text-[10px] font-mono text-text-muted tabular-nums shrink-0"
        style={{ minWidth: 14, letterSpacing: '0.1em' }}
      >
        {String(rank + 1).padStart(2, '0')}
      </span>
      <span className={`text-[14px] ${nameCls} flex-1 min-w-0 truncate`}>
        {outcome.name}
      </span>
      <div className="relative shrink-0" style={{ flex: 2, maxWidth: 240, height: 3 }}>
        <div
          className="absolute inset-0"
          style={{ background: 'rgb(var(--bg-elevated))', borderRadius: 2 }}
        />
        <div
          className="absolute top-0 left-0 bottom-0"
          style={{
            width: `${prob}%`,
            background: barFill,
            borderRadius: 2,
            transition: 'width 200ms ease',
          }}
        />
        {showGhost && aiFair != null && (
          <>
            <div
              className="absolute"
              style={{
                left: `${prob}%`,
                top: -2,
                width: 1,
                height: 7,
                background: 'rgb(var(--accent))',
              }}
            />
            <div
              className="absolute top-0 bottom-0"
              style={{
                left: `${prob}%`,
                width: `${Math.max(0, aiFair - prob)}%`,
                background: 'rgba(var(--accent-rgb), 0.25)',
                borderRadius: 2,
              }}
            />
          </>
        )}
      </div>
      {cardHasEdge && !isEdgeRow && (
        <span
          className="text-[11px] font-mono text-text-muted/40 tabular-nums text-right shrink-0"
          style={{ minWidth: 36 }}
        >
          —
        </span>
      )}
      {isEdgeRow && (
        <span
          className="text-[11px] font-mono font-bold tabular-nums text-right shrink-0"
          style={{
            minWidth: 36,
            color: edgeIsNegative ? 'rgb(var(--danger))' : 'rgb(var(--accent))',
          }}
        >
          {edge > 0 ? '+' : ''}
          {Math.round(edge)}pp
        </span>
      )}
      <span
        className={`text-[13px] font-mono font-bold tabular-nums ${probCls} shrink-0 text-right`}
        style={{ minWidth: 44 }}
      >
        {prob}%
      </span>
    </div>
  )
}

function MoreOutcomesRow({
  count,
  sumPct,
  tr,
}: {
  count: number
  sumPct: number
  tr: ReturnType<typeof useT>
}) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-[10px] font-mono text-text-muted/50 shrink-0" style={{ minWidth: 14 }}>
        —
      </span>
      <span className="text-[12px] italic text-text-muted flex-1 min-w-0 truncate">
        +{count} {tr('prediction_event_card.more_outcomes')}
      </span>
      <span
        className="text-[12px] font-mono tabular-nums text-text-muted/70 shrink-0 text-right"
        style={{ minWidth: 44 }}
      >
        {Math.round(sumPct)}%
      </span>
    </div>
  )
}

function ResolvedWinnerRow({
  outcome,
  tr,
}: {
  outcome: Outcome
  tr: ReturnType<typeof useT>
}) {
  const entry = outcome.entry != null ? Math.round(outcome.entry) : null
  const showArrow = entry != null && entry !== 100

  return (
    <div className="flex items-center gap-3">
      <span className="text-[13px] shrink-0" style={{ color: 'rgb(var(--alpha))', width: 14, textAlign: 'center' }}>
        ✓
      </span>
      <span className="text-[14px] text-text-primary flex-1 min-w-0 truncate font-medium">
        {outcome.name}
      </span>
      <span
        className="text-[10px] font-mono font-bold uppercase tracking-[0.1em] shrink-0"
        style={{
          color: 'rgb(var(--alpha))',
          border: '1px solid rgb(var(--alpha) / 0.3)',
          background: 'rgb(var(--alpha) / 0.1)',
          padding: '2px 6px',
          borderRadius: 3,
        }}
      >
        {tr('prediction_event_card.win_tag')}
      </span>
      {showArrow ? (
        <span className="text-[11px] font-mono tabular-nums text-text-muted shrink-0">
          {entry}% → <span className="text-text-primary">100%</span>
        </span>
      ) : (
        <span className="text-[11px] font-mono tabular-nums text-text-primary shrink-0">
          100%
        </span>
      )}
    </div>
  )
}

function renderFooter({
  hasEdge,
  edgeOutcome,
  totalVolume,
  totalVolume24h,
  isAggregateResolved,
  metaFinalDate,
  tr,
}: {
  hasEdge: boolean
  edgeOutcome: Outcome | null
  totalVolume: number
  totalVolume24h: number | null
  isAggregateResolved: boolean
  metaFinalDate: string | null
  tr: ReturnType<typeof useT>
}) {
  // Resolved variant
  if (isAggregateResolved) {
    if (!totalVolume && !metaFinalDate) return null
    return (
      <>
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted">
          {tr('prediction_event_card.final_vol')}{' '}
          <span className="text-text-secondary">{formatVolume(totalVolume)}</span>
        </span>
        {metaFinalDate && (
          <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted tabular-nums">
            {metaFinalDate}
          </span>
        )}
      </>
    )
  }

  // Edge variant
  if (hasEdge && edgeOutcome) {
    const edge = edgeOutcome.edge ?? 0
    const edgeColor = edge < 0 ? 'rgb(var(--danger))' : 'rgb(var(--accent))'
    const edgeName = edgeOutcome.name.length > 22
      ? `${edgeOutcome.name.slice(0, 22)}…`
      : edgeOutcome.name
    return (
      <>
        <span
          className="text-[10px] font-mono uppercase font-bold truncate"
          style={{ color: edgeColor, letterSpacing: '0.14em' }}
        >
          {tr('prediction_event_card.edge_prefix')} · {edgeName}{' '}
          <span className="tabular-nums">
            {edge > 0 ? '+' : ''}
            {Math.round(edge)}pp
          </span>
        </span>
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted shrink-0">
          {tr('prediction_event_card.vol')}{' '}
          <span className="text-text-secondary">{formatVolume(totalVolume)}</span>
        </span>
      </>
    )
  }

  // Default variant
  const has24h = totalVolume24h != null && totalVolume24h > 0
  if (!totalVolume && !has24h) return null
  return (
    <>
      <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted">
        {tr('prediction_event_card.vol')}{' '}
        <span className="text-text-secondary">{formatVolume(totalVolume)}</span>
      </span>
      {has24h && (
        <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted">
          {tr('prediction_event_card.vol_24h')}{' '}
          <span className="text-text-secondary">{formatVolume(totalVolume24h!)}</span>
        </span>
      )}
    </>
  )
}
