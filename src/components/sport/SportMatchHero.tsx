'use client'
import type { CSSProperties } from 'react'
import type { SportEvent, SportOdds } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT, type Lang } from '../../lib/i18n'
import { mapSportStatus } from '../../lib/sportEventStatus'
import { getPrxEdge } from '../../lib/prx'
import { useSubscriptionTier } from '../../hooks/useSubscriptionTier'
import { useLiveElapsed } from '../../hooks/useLiveElapsed'
import { PrxPill } from '../markets/prx/PrxPill'
import { PrxLockedPill } from '../markets/prx/PrxLockedPill'

type Sport = 'football' | 'basketball' | 'tennis' | 'mma' | 'other'

interface Props {
  event: SportEvent
  homeLogo?: string | null
  awayLogo?: string | null
  leagueLogo?: string | null
}

interface H2HRow { price: number; prob: number }
interface H2H { home: H2HRow | null; draw: H2HRow | null; away: H2HRow | null }

function detectSport(event: SportEvent): Sport {
  const sub = (event.subcategory ?? '').toLowerCase()
  if (sub.includes('football') || sub.includes('soccer')) return 'football'
  if (sub.includes('basket')) return 'basketball'
  if (sub.includes('tennis')) return 'tennis'
  if (sub.includes('mma') || sub.includes('ufc')) return 'mma'
  return 'other'
}

function monogram(name: string): string {
  const w = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase()
  return (name || '--').slice(0, 2).toUpperCase()
}

function extractH2H(odds: SportOdds[] | undefined, sport: Sport): H2H | null {
  const h2h = odds?.find((o) => o.market_type === 'h2h')
  if (!h2h || h2h.outcomes.length < 2) return null
  const pick = (m: (n: string) => boolean) =>
    h2h.outcomes.find((o) => m(o.name.toLowerCase()))
  const homeOut = pick((n) => n === 'home' || n === '1')
  const awayOut = pick((n) => n === 'away' || n === '2')
  const drawOut = pick((n) => n === 'draw' || n === 'x')
  const nonDraw = h2h.outcomes.filter((o) => {
    const n = o.name.toLowerCase()
    return n !== 'draw' && n !== 'x'
  })
  const home = homeOut ?? nonDraw[0]
  const away = awayOut ?? nonDraw[1]
  if (!home || !away) return null
  const showDraw = sport === 'football' && drawOut != null
  const rHome = 100 / home.price
  const rAway = 100 / away.price
  const rDraw = showDraw && drawOut ? 100 / drawOut.price : 0
  const sum = rHome + rAway + rDraw
  if (sum <= 0) return null
  return {
    home: { price: home.price, prob: Math.round((rHome / sum) * 100) },
    draw: showDraw && drawOut ? { price: drawOut.price, prob: Math.round((rDraw / sum) * 100) } : null,
    away: { price: away.price, prob: Math.round((rAway / sum) * 100) },
  }
}

function formatKickoff(iso: string, lang: Lang): string {
  const d = new Date(iso)
  const isToday = new Date().toDateString() === d.toDateString()
  const time = d.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return time
  const date = d.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', { day: '2-digit', month: 'short' })
  return `${date} · ${time}`
}

function TeamBlock({ logo, name }: { logo?: string | null; name: string }) {
  return (
    <div className="flex flex-col items-center gap-2 min-w-0 flex-1 px-2">
      {logo ? (
        <div
          className="shrink-0 flex items-center justify-center rounded-full overflow-hidden"
          style={{
            width: 56, height: 56,
            background: 'rgb(var(--bg-elevated))',
            border: '1px solid rgb(var(--bg-border))',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" loading="lazy"
            style={{ width: 42, height: 42, objectFit: 'contain' }} />
        </div>
      ) : (
        <div
          className="shrink-0 flex items-center justify-center rounded-full font-mono font-bold text-text-muted"
          style={{
            width: 56, height: 56, fontSize: 14,
            background: 'rgb(var(--bg-elevated))',
            border: '1px solid rgb(var(--bg-border))',
          }}
        >
          {monogram(name)}
        </div>
      )}
      <span className="text-[13px] text-center leading-tight w-full truncate text-text-secondary">
        {name}
      </span>
    </div>
  )
}

function StatusChip({ kind }: { kind: 'live' | 'resolved' | 'upcoming'; }) {
  const { lang } = useLang()
  const tr = useT(lang)
  if (kind === 'live') {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-[3px] rounded font-mono font-bold uppercase tracking-[0.12em] text-[10px]"
        style={{
          color: 'rgb(var(--alpha))',
          background: 'rgb(var(--alpha) / 0.1)',
          border: '1px solid rgb(var(--alpha) / 0.3)',
        }}
      >
        <span className="animate-pulse"
          style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgb(var(--alpha))' }} />
        {tr('common.live')}
      </span>
    )
  }
  if (kind === 'resolved') {
    return (
      <span
        className="inline-flex items-center px-2 py-[3px] rounded font-mono font-bold uppercase tracking-[0.12em] text-[10px] text-text-muted"
        style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}
      >
        {tr('card.final')}
      </span>
    )
  }
  return null
}

interface OddsCellProps {
  label: string
  price: number | null
  prob: number | null
  hasEdge: boolean
  isFree: boolean
  edge: number | null
  winHighlight?: boolean
}

function OddsCell({ label, price, prob, hasEdge, isFree, edge, winHighlight }: OddsCellProps) {
  const showPrxPill = hasEdge
  const style: CSSProperties = {
    padding: '10px 8px',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: hasEdge ? 'rgb(var(--accent))' : 'rgb(var(--bg-border))',
    background: winHighlight
      ? 'rgb(var(--accent) / 0.08)'
      : hasEdge
        ? 'rgb(var(--accent) / 0.04)'
        : 'rgb(var(--bg-surface))',
    borderRadius: 6,
  }
  return (
    <div className="flex flex-col items-center gap-1" style={style}>
      <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted leading-none">
        {label}
      </span>
      <span
        className={`text-[20px] font-mono font-bold tabular-nums leading-none ${
          winHighlight ? 'text-accent' : 'text-text-primary'
        }`}
      >
        {price != null ? price.toFixed(2) : '—'}
      </span>
      {prob != null && (
        <span className="text-[10px] font-mono tabular-nums text-text-muted leading-none">
          {prob}%
        </span>
      )}
      {showPrxPill && (
        <span className="mt-0.5">
          {isFree ? <PrxLockedPill /> : edge != null ? <PrxPill edge={edge} /> : null}
        </span>
      )}
    </div>
  )
}

interface HeroOddsGridProps {
  h2h: H2H
  sport: Sport
  edgeSide: 'home' | 'draw' | 'away' | null
  edge: number | null
  isFree: boolean
  winnerSide: 'home' | 'draw' | 'away' | null
}

function HeroOddsGrid({ h2h, sport, edgeSide, edge, isFree, winnerSide }: HeroOddsGridProps) {
  const { lang } = useLang()
  const tr = useT(lang)
  const showDraw = sport === 'football' && h2h.draw != null
  const cells: { side: 'home' | 'draw' | 'away'; row: H2HRow | null; label: string }[] = [
    { side: 'home', row: h2h.home, label: tr('sport_card.home') },
    ...(showDraw
      ? [{ side: 'draw' as const, row: h2h.draw, label: tr('sport_card.draw') }]
      : []),
    { side: 'away', row: h2h.away, label: tr('sport_card.away') },
  ]
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map(({ side, row, label }) => (
        <OddsCell
          key={side}
          label={label}
          price={row?.price ?? null}
          prob={row?.prob ?? null}
          hasEdge={edgeSide === side}
          isFree={isFree}
          edge={edge}
          winHighlight={winnerSide === side}
        />
      ))}
    </div>
  )
}

export default function SportMatchHero({ event, homeLogo, awayLogo, leagueLogo }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  const tier = useSubscriptionTier()
  const isFree = tier === 'free'

  const sport = detectSport(event)
  const status = mapSportStatus(event.status)
  const isLive = status === 'live'
  const isResolved = status === 'resolved'
  const isUpcoming = status === 'upcoming'

  const raw = (event.raw_data as Record<string, unknown> | null) ?? null
  const elapsedAnchor = raw?.elapsed as number | null | undefined
  const statusShort = raw?.status_short as string | null | undefined
  const elapsed = useLiveElapsed(elapsedAnchor, event.status, statusShort)

  const h2h = extractH2H(event.sport_odds, sport)
  const prxEdge = getPrxEdge(event)
  const hasEdge = prxEdge != null
  const edgeSide: 'home' | 'draw' | 'away' | null = (() => {
    if (!hasEdge) return null
    return prxEdge! > 0 ? 'home' : 'away'
  })()

  const hs = event.home_score
  const as = event.away_score
  const hasScore = hs != null && as != null
  const winnerSide: 'home' | 'draw' | 'away' | null = (() => {
    if (!isResolved || !hasScore) return null
    if (hs! > as!) return 'home'
    if (as! > hs!) return 'away'
    return sport === 'football' ? 'draw' : null
  })()

  return (
    <section
      className="px-4 py-4 sm:px-5 sm:py-5"
      style={{
        background: 'rgb(var(--bg-base))',
        borderBottom: '1px solid rgb(var(--bg-border))',
      }}
    >
      {/* Meta row: league + status */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {leagueLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leagueLogo} alt="" loading="lazy"
              className="w-3.5 h-3.5 object-contain shrink-0 opacity-60" />
          )}
          <span className="text-[10px] font-mono uppercase tracking-[0.08em] text-text-muted truncate">
            {event.league ?? ''}
          </span>
        </div>
        {isLive && <StatusChip kind="live" />}
        {isResolved && <StatusChip kind="resolved" />}
        {isUpcoming && (
          <span className="text-[10px] font-mono tabular-nums uppercase tracking-[0.08em] text-text-muted shrink-0">
            {formatKickoff(event.starts_at, lang)}
          </span>
        )}
      </div>

      {/* Teams row */}
      <div className="flex items-stretch mb-4">
        <TeamBlock logo={homeLogo} name={event.home_team} />

        {/* Center: score for live/resolved, countdown for upcoming */}
        <div className="flex flex-col items-center justify-center shrink-0" style={{ minWidth: 120 }}>
          {isUpcoming ? (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-text-muted">
                {tr('match_detail.hero.kickoff')}
              </span>
              <span className="text-[22px] font-mono font-bold tabular-nums text-text-primary leading-none">
                {formatKickoff(event.starts_at, lang)}
              </span>
            </div>
          ) : hasScore ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-baseline gap-2 leading-none">
                <span className="text-[40px] font-mono font-bold tabular-nums leading-none text-text-primary">
                  {hs}
                </span>
                <span className="text-[22px] font-mono leading-none text-text-muted" style={{ fontWeight: 300 }}>:</span>
                <span className="text-[40px] font-mono font-bold tabular-nums leading-none text-text-primary">
                  {as}
                </span>
              </div>
              {isLive && elapsed != null && (
                <span className="text-[12px] font-mono tabular-nums text-alpha leading-none">
                  {elapsed}&apos;
                </span>
              )}
              {isResolved && (
                <span className="text-[9px] font-mono uppercase tracking-[0.1em] text-text-muted leading-none">
                  {tr('card.final')}
                </span>
              )}
            </div>
          ) : (
            // Live without score — show elapsed only (no "— : —" placeholder)
            isLive && elapsed != null && (
              <span className="text-[22px] font-mono tabular-nums text-alpha">{elapsed}&apos;</span>
            )
          )}
        </div>

        <TeamBlock logo={awayLogo} name={event.away_team} />
      </div>

      {/* Odds grid — always rendered when h2h available (all statuses) */}
      {h2h && (
        <HeroOddsGrid
          h2h={h2h}
          sport={sport}
          edgeSide={edgeSide}
          edge={prxEdge}
          isFree={isFree}
          winnerSide={winnerSide}
        />
      )}
    </section>
  )
}
