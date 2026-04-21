'use client'
import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import type { EsportsMatch, EsportsGame } from '../../types'
import { useLang } from '../../contexts/LanguageContext'
import { useT, type Lang } from '../../lib/i18n'
import { getPrxEdge } from '../../lib/prx'
import { useSubscriptionTier } from '../../hooks/useSubscriptionTier'
import { PrxPill } from '../markets/prx/PrxPill'
import { PrxLockedPill } from '../markets/prx/PrxLockedPill'
import { PrxFooterLine } from '../markets/prx/PrxFooterLine'
import { PrxLockedFooter } from '../markets/prx/PrxLockedFooter'

interface Props {
  match: EsportsMatch
  href: string
  onClick?: () => void
}

function parseBoN(format: string): number | null {
  const m = format.toLowerCase().match(/bo\s*(\d+)/) ?? format.toLowerCase().match(/best.?of.?(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

function monogram(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
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

function decimalOddsFromBinary(prob: number): string {
  if (prob <= 0 || prob >= 1) return '—'
  return (1 / prob).toFixed(2)
}

function StatusTag({ status }: { status: 'upcoming' | 'live' | 'resolved' | 'cancelled' }) {
  const { lang } = useLang()
  const tr = useT(lang)
  const labelKey = status === 'resolved' ? 'market.status.resolved' : (`market.status.${status}` as const)
  const label = tr(labelKey as Parameters<typeof tr>[0])
  const tone = (() => {
    switch (status) {
      case 'live':
        return { color: 'rgb(var(--alpha))', bg: 'rgb(var(--alpha) / 0.1)', border: 'rgb(var(--alpha) / 0.3)', pulse: true }
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

function TeamAvatar({ logo, name }: { logo?: string | null; name: string }) {
  if (logo) {
    return (
      <div
        className="shrink-0 flex items-center justify-center overflow-hidden border border-bg-border"
        style={{ width: 28, height: 28, borderRadius: 6, background: 'rgb(var(--bg-elevated))' }}
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
      className="shrink-0 flex items-center justify-center border border-bg-border text-text-muted"
      style={{ width: 28, height: 28, borderRadius: 6, fontSize: 10, fontFamily: 'var(--font-mono)' }}
    >
      {monogram(name)}
    </div>
  )
}

function MapScorePill({ score, tone }: { score: number | string; tone: 'win' | 'loss' | 'current' | 'pending' }) {
  const style = (() => {
    switch (tone) {
      case 'win':
        return { border: '1px solid rgb(var(--alpha))', color: 'rgb(var(--alpha))' }
      case 'loss':
        return { border: '1px solid rgb(var(--danger))', color: 'rgb(var(--danger))' }
      case 'current':
        return { border: '1px solid rgb(var(--text-primary))', color: 'rgb(var(--text-primary))' }
      default:
        return { border: '1px solid rgb(var(--bg-border))', color: 'rgb(var(--text-muted))' }
    }
  })()
  return (
    <span
      className="inline-flex items-center justify-center text-[11px] font-mono font-bold tabular-nums"
      style={{ padding: '2px 6px', borderRadius: 3, ...style }}
    >
      {score}
    </span>
  )
}

interface TeamRowProps {
  name: string
  logo?: string | null
  mainValue: string
  mainTone: 'primary' | 'secondary' | 'muted'
  rightPill?: ReactNode
  aiFair?: string | null
  mapPills?: ReactNode
  winTagLabel?: string | null
}

function TeamRow({ name, logo, mainValue, mainTone, rightPill, aiFair, mapPills, winTagLabel }: TeamRowProps) {
  const mainCls =
    mainTone === 'primary'
      ? 'text-text-primary'
      : mainTone === 'secondary'
        ? 'text-text-secondary'
        : 'text-text-muted'
  return (
    <div className="flex items-center gap-3 py-1.5">
      <TeamAvatar logo={logo} name={name} />
      <span className={`text-[15px] truncate ${mainCls}`}>{name}</span>
      {mapPills && <span className="flex items-center gap-1 shrink-0">{mapPills}</span>}
      <span className="flex-1" />
      {winTagLabel && (
        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.12em] text-accent shrink-0">
          {winTagLabel}
        </span>
      )}
      {rightPill && <span className="shrink-0">{rightPill}</span>}
      {aiFair && !rightPill && (
        <span className="text-[11px] font-mono text-text-muted tabular-nums shrink-0">{aiFair}</span>
      )}
      <span className={`text-[22px] font-mono font-bold tabular-nums leading-none min-w-[64px] text-right shrink-0 ${mainCls}`}>
        {mainValue}
      </span>
    </div>
  )
}

function detectGame(match: EsportsMatch): 'dota2' | 'cs2' | 'other' {
  const games = match.games ?? []
  const firstMap = games[0]?.map?.toLowerCase() ?? ''
  const cs2Maps = ['mirage', 'inferno', 'nuke', 'dust', 'vertigo', 'ancient', 'anubis', 'overpass', 'train']
  if (cs2Maps.some((m) => firstMap.includes(m))) return 'cs2'
  if (firstMap || match.games.some((g) => g.rounds.length > 0)) {
    return firstMap === '' ? 'dota2' : 'other'
  }
  return 'other'
}

function renderCs2MapPills(
  games: EsportsGame[],
  side: 'A' | 'B',
): ReactNode {
  return games.map((g) => {
    const myScore = side === 'A' ? g.teamA?.score : g.teamB?.score
    const oppScore = side === 'A' ? g.teamB?.score : g.teamA?.score
    const myWon = side === 'A' ? g.teamA?.won : g.teamB?.won
    const oppWon = side === 'A' ? g.teamB?.won : g.teamA?.won
    const isCurrent = g.started && !g.finished
    if (isCurrent) {
      return (
        <MapScorePill
          key={g.seq}
          score={myScore != null ? myScore : '—'}
          tone="current"
        />
      )
    }
    if (g.finished) {
      const tone = myWon ? 'win' : oppWon ? 'loss' : 'pending'
      return (
        <MapScorePill
          key={g.seq}
          score={myScore != null ? myScore : '—'}
          tone={tone}
        />
      )
    }
    if (myScore != null || oppScore != null) {
      return <MapScorePill key={g.seq} score={myScore ?? '—'} tone="pending" />
    }
    return null
  })
}

function formatMapList(games: EsportsGame[], lang: Lang, tr: ReturnType<typeof useT>): string {
  const parts: string[] = []
  for (const g of games) {
    if (!g.map) continue
    const mapName = g.map.toUpperCase()
    if (g.started && !g.finished) {
      const suffix = tr('esports_card.map_live_suffix')
      parts.push(`${mapName} ${suffix}`)
    } else {
      parts.push(mapName)
    }
  }
  return parts.join(' · ')
}

function formatResolvedMapLine(games: EsportsGame[]): string {
  const parts: string[] = []
  for (const g of games) {
    if (!g.finished) continue
    const mapName = g.map ? g.map.toUpperCase() : `MAP ${g.seq}`
    const sA = g.teamA?.score
    const sB = g.teamB?.score
    if (sA != null && sB != null) parts.push(`${mapName} ${sA}–${sB}`)
    else parts.push(mapName)
  }
  return parts.join(' · ')
}

export default function EsportsMatchCard({ match, href, onClick }: Props) {
  const { lang } = useLang()
  const tr = useT(lang)
  const tier = useSubscriptionTier()
  const isFree = tier === 'free'

  const game = detectGame(match)
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const isUpcoming = match.status === 'upcoming'
  const status: 'upcoming' | 'live' | 'resolved' | 'cancelled' = isLive
    ? 'live'
    : isFinished
      ? 'resolved'
      : 'upcoming'

  const prxEdge = getPrxEdge(match)
  const hasEdge = prxEdge != null
  const showEdgeBorder = hasEdge && !isFree
  const edgeSide: 'teamA' | 'teamB' | null = hasEdge ? (prxEdge! > 0 ? 'teamA' : 'teamB') : null

  const seriesA = match.games.filter((g) => g.teamA?.won).length
  const seriesB = match.games.filter((g) => g.teamB?.won).length
  const aWinsAll = isFinished && seriesA > seriesB
  const bWinsAll = isFinished && seriesB > seriesA

  const yesProb = match.yesPrice > 1 ? match.yesPrice / 100 : match.yesPrice
  const noProb = match.noPrice > 1 ? match.noPrice / 100 : match.noPrice
  const yesPct = Math.round(yesProb * 100)
  const noPct = Math.round(noProb * 100)

  const bo = parseBoN(match.format ?? '')
  const liveGame = isLive ? match.games.find((g) => g.started && !g.finished) : null

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
    opacity: isFinished ? 0.75 : undefined,
  }

  const metaRight = (() => {
    if (isLive && liveGame) {
      const mapName = liveGame.map ? liveGame.map.toUpperCase() : `MAP ${liveGame.seq}`
      return (
        <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-text-primary">
          {mapName}
        </span>
      )
    }
    if (isUpcoming) {
      return (
        <span className="text-[11px] font-mono tabular-nums uppercase tracking-[0.08em] text-text-muted">
          {formatKickoff(match.startsAt, lang)}
        </span>
      )
    }
    return null
  })()

  const rowPill = (side: 'teamA' | 'teamB') => {
    if (!hasEdge || edgeSide !== side) return null
    if (isFree) return <PrxLockedPill />
    return <PrxPill edge={prxEdge!} />
  }

  const mainValueFor = (side: 'teamA' | 'teamB'): string => {
    if (isFinished) return String(side === 'teamA' ? seriesA : seriesB)
    if (isLive) return side === 'teamA' ? `${yesPct}%` : `${noPct}%`
    // upcoming — win %
    return side === 'teamA' ? `${yesPct}%` : `${noPct}%`
  }

  const aiFairFor = (side: 'teamA' | 'teamB'): string | null => {
    if (!isUpcoming) return null
    const prob = side === 'teamA' ? yesProb : noProb
    return `AI ${decimalOddsFromBinary(prob)}`
  }

  const toneFor = (side: 'teamA' | 'teamB'): 'primary' | 'secondary' | 'muted' => {
    if (isFinished) {
      if (side === 'teamA') return aWinsAll ? 'primary' : 'muted'
      return bWinsAll ? 'primary' : 'muted'
    }
    return 'primary'
  }

  const winTagFor = (side: 'teamA' | 'teamB'): string | null => {
    if (!isFinished) return null
    if (side === 'teamA' && aWinsAll) return tr('card.win_tag')
    if (side === 'teamB' && bWinsAll) return tr('card.win_tag')
    return null
  }

  const mapPillsFor = (side: 'teamA' | 'teamB'): ReactNode => {
    if (game !== 'cs2') return null
    if (!isLive && !isFinished) return null
    return renderCs2MapPills(match.games, side === 'teamA' ? 'A' : 'B')
  }

  const footer = (() => {
    if (hasEdge && isFinished) {
      const outcomeLabel = edgeSide === 'teamA' ? match.teamA.name : match.teamB.name
      const edgeWon =
        (edgeSide === 'teamA' && aWinsAll) || (edgeSide === 'teamB' && bWinsAll)
      return (
        <div className="mt-3 pt-3 border-t border-bg-border/50">
          <PrxFooterLine
            outcomeLabel={outcomeLabel.toUpperCase()}
            edge={prxEdge!}
            variant="resolved"
            resolved={edgeWon ? 'yes' : 'no'}
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
      const outcomeLabel = edgeSide === 'teamA' ? match.teamA.name : match.teamB.name
      return (
        <div className="mt-3 pt-3 border-t border-bg-border/50">
          <PrxFooterLine outcomeLabel={outcomeLabel.toUpperCase()} edge={prxEdge!} />
        </div>
      )
    }
    // Default footers
    const pieces: string[] = []
    if (isFinished) {
      const mapLine = formatResolvedMapLine(match.games)
      if (mapLine) pieces.push(mapLine)
    } else if (isLive && game === 'cs2') {
      const maps = formatMapList(match.games, lang, tr)
      if (maps) pieces.push(maps)
    }
    if (bo) pieces.push(tr('esports_card.bo').replace('{n}', String(bo)))
    if (match.tournament) pieces.push(match.tournament)
    if (pieces.length === 0) return null
    return (
      <div className="mt-3 pt-3 border-t border-bg-border/50 text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted truncate">
        {pieces.join(' · ')}
      </div>
    )
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
      aria-label={`${match.teamA.name} vs ${match.teamB.name}`}
      className="group relative block no-underline bg-bg-surface rounded-lg cursor-pointer
        hover:bg-bg-elevated/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={cardStyle}
    >
      {/* Row 1: meta */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-text-muted">
            {game === 'cs2' ? 'CS2' : game === 'dota2' ? 'DOTA 2' : 'ESPORTS'}
          </span>
          {match.tournament && (
            <>
              <span className="text-text-muted/50 text-[10px] font-mono">·</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.1em] text-text-muted truncate">
                {match.tournament}
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
          name={match.teamA.name}
          logo={match.teamA.logoUrl}
          mainValue={mainValueFor('teamA')}
          mainTone={toneFor('teamA')}
          rightPill={rowPill('teamA')}
          aiFair={aiFairFor('teamA')}
          mapPills={mapPillsFor('teamA')}
          winTagLabel={winTagFor('teamA')}
        />
        <TeamRow
          name={match.teamB.name}
          logo={match.teamB.logoUrl}
          mainValue={mainValueFor('teamB')}
          mainTone={toneFor('teamB')}
          rightPill={rowPill('teamB')}
          aiFair={aiFairFor('teamB')}
          mapPills={mapPillsFor('teamB')}
          winTagLabel={winTagFor('teamB')}
        />
      </div>

      {footer}
    </Link>
  )
}
