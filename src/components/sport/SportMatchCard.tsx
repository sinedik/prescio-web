'use client'
import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { SportEvent, SportOdds } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT, type Lang } from '../../lib/i18n'
import { mapSportStatus } from '../../lib/sportEventStatus'
import { getPrxEdge } from '../../lib/prx'
import { useSubscriptionTier } from '../../hooks/useSubscriptionTier'
import { useLiveElapsed } from '../../hooks/useLiveElapsed'
import { PrxPill } from '../markets/prx/PrxPill'
import { PrxLockedPill } from '../markets/prx/PrxLockedPill'
import { PrxFooterLine } from '../markets/prx/PrxFooterLine'
import { PrxLockedFooter } from '../markets/prx/PrxLockedFooter'

interface Props {
  event: SportEvent
  href: string
  onClick?: () => void
}

type Sport = 'football' | 'basketball' | 'tennis' | 'mma' | 'other'

interface H2HRow {
  price: number
  prob: number
}

interface H2H {
  home: H2HRow | null
  draw: H2HRow | null
  away: H2HRow | null
}

function detectSport(event: SportEvent): Sport {
  const sub = (event.subcategory ?? '').toLowerCase()
  if (sub.includes('football') || sub.includes('soccer')) return 'football'
  if (sub.includes('basket')) return 'basketball'
  if (sub.includes('tennis')) return 'tennis'
  if (sub.includes('mma') || sub.includes('ufc')) return 'mma'
  return 'other'
}

function extractH2H(odds: SportOdds[] | undefined, sport: Sport): H2H | null {
  const h2h = odds?.find((o) => o.market_type === 'h2h')
  if (!h2h || h2h.outcomes.length < 2) return null

  const pick = (match: (n: string) => boolean) =>
    h2h.outcomes.find((o) => match(o.name.toLowerCase()))

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
  const rawHome = 100 / home.price
  const rawAway = 100 / away.price
  const rawDraw = showDraw && drawOut ? 100 / drawOut.price : 0
  const sum = rawHome + rawAway + rawDraw
  if (sum <= 0) return null

  return {
    home: { price: home.price, prob: Math.round((rawHome / sum) * 100) },
    draw: showDraw && drawOut ? { price: drawOut.price, prob: Math.round((rawDraw / sum) * 100) } : null,
    away: { price: away.price, prob: Math.round((rawAway / sum) * 100) },
  }
}

function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (name || '--').slice(0, 2).toUpperCase()
}

function formatKickoff(iso: string, lang: Lang): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCountdown(iso: string, lang: Lang, tr: ReturnType<typeof useT>): string {
  const diffMs = new Date(iso).getTime() - Date.now()
  const mins = Math.round(diffMs / 60000)
  if (mins > 0 && mins < 60) return tr('sport_card.in_minutes').replace('{n}', String(mins))
  return formatKickoff(iso, lang)
}

function StatusTag({ status }: { status: 'upcoming' | 'live' | 'resolved' | 'cancelled' | 'resolving' }) {
  const { lang } = useLang()
  const tr = useT(lang)
  const label = tr(`market.status.${status}` as Parameters<typeof tr>[0])
  const tone = (() => {
    switch (status) {
      case 'live':
        return { color: 'rgb(var(--alpha))', bg: 'rgb(var(--alpha) / 0.1)', border: 'rgb(var(--alpha) / 0.3)', pulse: true }
      case 'resolving':
        return { color: 'rgb(var(--watch))', bg: 'rgb(var(--watch) / 0.1)', border: 'rgb(var(--watch) / 0.3)', pulse: true }
      case 'cancelled':
        return { color: 'rgb(var(--danger))', bg: 'rgb(var(--danger) / 0.1)', border: 'rgb(var(--danger) / 0.3)', pulse: false }
      case 'resolved':
        return { color: 'rgb(var(--text-muted))', bg: 'rgb(var(--bg-elevated))', border: 'rgb(var(--bg-border))', pulse: false }
      default:
        return { color: 'rgb(var(--text-secondary))', bg: 'rgb(var(--bg-elevated))', border: 'rgb(var(--bg-border))', pulse: false }
    }
  })()
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider text-[10px]"
      style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      {tone.pulse && (
        <span
          className="animate-pulse"
          style={{ width: 5, height: 5, borderRadius: '50%', background: tone.color }}
        />
      )}
      <span>{label}</span>
    </span>
  )
}

function TeamAvatar({ logo, name, accent }: { logo?: string | null; name: string; accent?: string }) {
  if (logo) {
    return (
      <div
        className="shrink-0 flex items-center justify-center rounded-full overflow-hidden border border-bg-border"
        style={{ width: 28, height: 28, background: accent ?? 'rgb(var(--bg-elevated))' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          loading="lazy"
          style={{ width: 22, height: 22, objectFit: 'contain' }}
        />
      </div>
    )
  }
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full border border-bg-border text-text-muted"
      style={{ width: 28, height: 28, fontSize: 10, fontFamily: 'var(--font-mono)' }}
    >
      {monogram(name)}
    </div>
  )
}

function DrawAvatar() {
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full border border-dashed border-bg-border text-text-muted"
      style={{ width: 28, height: 28, fontSize: 10, fontFamily: 'var(--font-mono)' }}
    >
      X
    </div>
  )
}

interface TeamRowProps {
  name: string
  logo?: string | null
  mainValue: string
  mainTone: 'primary' | 'secondary' | 'muted'
  rightPill?: React.ReactNode
  aiFair?: string | null
  isDraw?: boolean
  winTagLabel?: string | null
}

function TeamRow({
  name,
  logo,
  mainValue,
  mainTone,
  rightPill,
  aiFair,
  isDraw,
  winTagLabel,
}: TeamRowProps) {
  const mainCls =
    mainTone === 'primary'
      ? 'text-text-primary'
      : mainTone === 'secondary'
        ? 'text-text-secondary'
        : 'text-text-muted'
  return (
    <div className="flex items-center gap-3 py-1.5">
      {isDraw ? <DrawAvatar /> : <TeamAvatar logo={logo} name={name} />}
      <span className={`flex-1 text-[15px] truncate ${mainCls}`}>{name}</span>
      {winTagLabel && (
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-accent shrink-0">
          {winTagLabel}
        </span>
      )}
      {rightPill && <span className="shrink-0">{rightPill}</span>}
      {aiFair && !rightPill && (
        <span className="text-[11px] font-mono text-text-muted tabular-nums shrink-0">{aiFair}</span>
      )}
      <span className={`text-[22px] font-mono font-bold tabular-nums leading-none min-w-[56px] text-right shrink-0 ${mainCls}`}>
        {mainValue}
      </span>
    </div>
  )
}

export default function SportMatchCard({ event, href, onClick }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  const tier = useSubscriptionTier()
  const isFree = tier === 'free'

  const sport = detectSport(event)
  const status = mapSportStatus(event.status)
  const isLive = status === 'live'
  const isResolved = status === 'resolved'
  const isUpcoming = status === 'upcoming'
  const isCancelled = status === 'cancelled'

  const raw = (event.raw_data as Record<string, unknown> | null) ?? null
  const homeLogo = (raw?.home_logo as string | null | undefined) ?? null
  const awayLogo = (raw?.away_logo as string | null | undefined) ?? null
  const elapsedAnchor = raw?.elapsed as number | null | undefined
  const statusShort = raw?.status_short as string | null | undefined
  const elapsed = useLiveElapsed(elapsedAnchor, event.status, statusShort)

  const h2h = extractH2H(event.sport_odds, sport)
  const prxEdge = getPrxEdge(event)
  const hasEdge = prxEdge != null
  const showEdgeBorder = hasEdge && !isFree

  const homeScore = event.home_score
  const awayScore = event.away_score
  const hasScore = homeScore != null && awayScore != null
  const homeWin = isResolved && hasScore ? homeScore! > awayScore! : false
  const awayWin = isResolved && hasScore ? awayScore! > homeScore! : false

  const cardStyle: CSSProperties = {
    padding: '20px 24px',
    paddingLeft: showEdgeBorder ? '22px' : '24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgb(var(--bg-border))',
    borderLeftWidth: showEdgeBorder ? '2px' : '1px',
    borderLeftColor: showEdgeBorder ? 'rgb(var(--accent))' : 'rgb(var(--bg-border))',
    outlineColor: 'rgb(var(--accent))',
    transition: 'background-color 120ms ease, border-color 120ms ease',
    opacity: isResolved || isCancelled ? 0.75 : undefined,
  }

  const metaRight = (() => {
    if (isLive && elapsed != null) {
      return (
        <span className="text-[11px] font-mono tabular-nums text-text-primary">
          {elapsed}&apos;
        </span>
      )
    }
    if (isUpcoming) {
      return (
        <span className="text-[11px] font-mono tabular-nums uppercase tracking-[0.08em] text-text-muted">
          {formatCountdown(event.starts_at, lang, tr)}
        </span>
      )
    }
    return null
  })()

  const renderH2HMainValue = (row: H2HRow | null): string =>
    row ? row.price.toFixed(2) : '—'
  const renderAIFair = (row: H2HRow | null): string | null =>
    row ? `AI ${row.price.toFixed(2)}` : null

  const edgeSide: 'home' | 'draw' | 'away' | null = (() => {
    if (!hasEdge) return null
    if (prxEdge! > 0) return 'home'
    return 'away'
  })()

  const rowPill = (side: 'home' | 'draw' | 'away') => {
    if (!hasEdge || edgeSide !== side) return null
    if (isFree) return <PrxLockedPill />
    return <PrxPill edge={prxEdge!} />
  }

  const mainValueFor = (side: 'home' | 'draw' | 'away', row: H2HRow | null): string => {
    if (isLive && (side === 'home' || side === 'away') && hasScore) {
      return String(side === 'home' ? homeScore : awayScore)
    }
    if (isResolved && (side === 'home' || side === 'away') && hasScore) {
      return String(side === 'home' ? homeScore : awayScore)
    }
    return renderH2HMainValue(row)
  }

  const mainToneFor = (
    side: 'home' | 'draw' | 'away',
  ): 'primary' | 'secondary' | 'muted' => {
    if (isResolved) {
      if (side === 'home') return homeWin ? 'primary' : 'muted'
      if (side === 'away') return awayWin ? 'primary' : 'muted'
      return 'muted'
    }
    return 'primary'
  }

  const winTagFor = (side: 'home' | 'draw' | 'away'): string | null => {
    if (!isResolved) return null
    if (side === 'home' && homeWin) return tr('card.win_tag')
    if (side === 'away' && awayWin) return tr('card.win_tag')
    return null
  }

  const footer = (() => {
    if (hasEdge && isResolved) {
      const outcomeLabel =
        edgeSide === 'home'
          ? event.home_team
          : edgeSide === 'away'
            ? event.away_team
            : tr('sport_card.draw')
      return (
        <div className="mt-3 pt-3 border-t border-bg-border/50">
          <PrxFooterLine
            outcomeLabel={outcomeLabel.toUpperCase()}
            edge={prxEdge!}
            variant="resolved"
            resolved={edgeSide === 'home' && homeWin ? 'yes' : edgeSide === 'away' && awayWin ? 'yes' : 'no'}
          />
        </div>
      )
    }
    if (hasEdge && isUpcoming) {
      if (isFree) {
        return (
          <div className="mt-3 pt-3 border-t border-bg-border/50">
            <PrxLockedFooter />
          </div>
        )
      }
      const outcomeLabel =
        edgeSide === 'home'
          ? tr('sport_card.home')
          : edgeSide === 'away'
            ? tr('sport_card.away')
            : tr('sport_card.draw')
      return (
        <div className="mt-3 pt-3 border-t border-bg-border/50">
          <PrxFooterLine outcomeLabel={outcomeLabel} edge={prxEdge!} />
        </div>
      )
    }
    if (event.league) {
      return (
        <div className="mt-3 pt-3 border-t border-bg-border/50 text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
          {event.league}
        </div>
      )
    }
    return null
  })()

  return (
    <Link
      href={href}
      onClick={(e) => {
        if (!onClick) return
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
        e.preventDefault()
        onClick()
      }}
      prefetch={false}
      aria-label={`${event.home_team} vs ${event.away_team}`}
      className="group relative block no-underline bg-bg-surface rounded-lg cursor-pointer
        hover:bg-bg-elevated/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={cardStyle}
    >
      {/* Row 1: meta */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {sport === 'other' ? (event.subcategory ?? '').toUpperCase() : sport.toUpperCase()}
          </span>
          {event.league && (
            <>
              <span className="text-text-muted/50 text-[10px] font-mono">·</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted truncate">
                {event.league}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusTag status={status} />
          {metaRight}
        </div>
      </div>

      {/* Row 2: teams */}
      <div className="mt-3 flex flex-col">
        <TeamRow
          name={event.home_team}
          logo={homeLogo}
          mainValue={mainValueFor('home', h2h?.home ?? null)}
          mainTone={mainToneFor('home')}
          rightPill={rowPill('home')}
          aiFair={isUpcoming ? renderAIFair(h2h?.home ?? null) : null}
          winTagLabel={winTagFor('home')}
        />
        {sport === 'football' && h2h?.draw && isUpcoming && (
          <TeamRow
            name={tr('sport_card.draw')}
            mainValue={renderH2HMainValue(h2h.draw)}
            mainTone="secondary"
            rightPill={rowPill('draw')}
            aiFair={renderAIFair(h2h.draw)}
            isDraw
          />
        )}
        <TeamRow
          name={event.away_team}
          logo={awayLogo}
          mainValue={mainValueFor('away', h2h?.away ?? null)}
          mainTone={mainToneFor('away')}
          rightPill={rowPill('away')}
          aiFair={isUpcoming ? renderAIFair(h2h?.away ?? null) : null}
          winTagLabel={winTagFor('away')}
        />
      </div>

      {footer}
    </Link>
  )
}
