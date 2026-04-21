'use client'
import { useState, useMemo, useEffect, memo } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
import { normalizeBinary } from '../lib/probabilities'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { EsportsMatch } from '../types'
import { useLiveLayout } from '../contexts/LiveLayoutContext'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import PrescioLoader from '../components/PrescioLoader'
import { Pagination } from '../components/live/Pagination'
import { GroupDivider } from '../components/live/GroupDivider'
import { ActiveFilterBanner } from '../components/live/ActiveFilterBanner'
import { scrollLiveContentToTop } from '../components/live/scrollLiveContent'
import { useLoaderMinHold } from '../components/live/useLoaderMinHold'

const CS2MatchScreen  = dynamic(() => import('./CS2MatchScreen'),  { loading: () => <MatchSkeleton /> })
const DotaMatchScreen = dynamic(() => import('./DotaMatchScreen'), { loading: () => <MatchSkeleton /> })

function MatchSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-24 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="h-10 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="h-64 rounded-lg bg-bg-surface border border-bg-border" />
    </div>
  )
}


export type Game = 'cs2' | 'dota2'
type TimeWin = 'live' | '1h' | '3h' | '12h' | 'all'


const ACCENT: Record<Game, string> = {
  cs2:   'rgb(var(--sport-cs2-rgb))',
  dota2: 'rgb(var(--sport-dota2-rgb))',
}

const TIME_LABELS: Record<TimeWin, string> = {
  live: 'LIVE',
  '1h': '1H',
  '3h': '3H',
  '12h': '12H',
  all: 'ALL',
}

const REFRESH_INTERVAL = 60_000
const CACHE_TTL        = 55_000  // slightly below refresh interval

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string, max = 16) {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

function nameToColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return `hsl(${Math.abs(hash) % 360}, 55%, 52%)`
}

function parseFormatLabel(format: string): string {
  const f = format.toLowerCase()
  const m = f.match(/bo\s*(\d+)/) ?? f.match(/best.?of.?(\d+)/)
  return m ? `BO${m[1]}` : format.toUpperCase()
}

function formatTime(iso: string, lang: 'en' | 'ru', tomorrowLabel: string) {
  const d = new Date(iso)
  const now = new Date()
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  const hm = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  if (sameDay)    return hm
  if (isTomorrow) return `${tomorrowLabel} ${hm}`
  const diffH = (d.getTime() - now.getTime()) / 3_600_000
  if (Math.abs(diffH) < 24 * 7) {
    return d.toLocaleDateString(locale, { weekday: 'short' }) + ' ' + hm
  }
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

function statusRank(s: EsportsMatch['status']): number {
  if (s === 'live') return 0
  if (s === 'upcoming') return 1
  return 2  // finished
}

function sortMatches(matches: EsportsMatch[]): EsportsMatch[] {
  const now = Date.now()
  return [...matches].sort((a, b) => {
    const ra = statusRank(a.status), rb = statusRank(b.status)
    if (ra !== rb) return ra - rb
    const ta = new Date(a.startsAt).getTime(), tb = new Date(b.startsAt).getTime()
    if (a.status === 'finished') return tb - ta              // newest finished first
    if (a.status === 'upcoming') return ta - tb              // soonest upcoming first
    // live: newest started first (closest to now)
    return Math.abs(ta - now) - Math.abs(tb - now)
  })
}

function groupByTournament(matches: EsportsMatch[]) {
  const sorted = sortMatches(matches)
  const map = new Map<string, EsportsMatch[]>()
  // Order tournaments by their best (live > upcoming > finished) match
  for (const m of sorted) {
    const key = m.tournament || 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries()).map(([tournament, matches]) => ({ tournament, matches }))
}

function isPlaceholderName(name: string | undefined | null): boolean {
  if (!name) return true
  const n = name.trim().toUpperCase()
  if (!n) return true
  if (n === 'TBD' || n.includes('TBD')) return true
  if (/^CS2-\d+$/.test(n)) return true
  if (/^DOTA-\d+$/.test(n)) return true
  return false
}

function isTestMatch(m: EsportsMatch): boolean {
  return isPlaceholderName(m.teamA?.name) || isPlaceholderName(m.teamB?.name)
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const EVENTS_PER_PAGE = 20

type TournamentGroup = { tournament: string; matches: EsportsMatch[] }

function paginateGroups(groups: TournamentGroup[], page: number): TournamentGroup[] {
  let skip = (page - 1) * EVENTS_PER_PAGE
  let remaining = EVENTS_PER_PAGE
  const result: TournamentGroup[] = []
  for (const g of groups) {
    if (remaining <= 0) break
    if (skip >= g.matches.length) { skip -= g.matches.length; continue }
    const slice = g.matches.slice(skip, skip + remaining)
    result.push({ tournament: g.tournament, matches: slice })
    remaining -= slice.length
    skip = 0
  }
  return result
}

function totalMatches(groups: TournamentGroup[]) {
  return groups.reduce((s, g) => s + g.matches.length, 0)
}

// ─── CS2 components ───────────────────────────────────────────────────────────

function Cs2TeamLogo({ logoUrl, name }: { logoUrl?: string | null; name: string }) {
  const [err, setErr] = useState(false)
  if (logoUrl && !err) {
    return (
      <img src={logoUrl} alt={name} width={16} height={16}
        onError={() => setErr(true)}
        className="object-contain rounded-sm shrink-0"
        style={{ width: 16, height: 16, border: '0.5px solid rgba(var(--surface-tint-rgb),0.15)' }}
      />
    )
  }
  return (
    <div className="rounded-sm flex items-center justify-center font-mono font-bold text-white shrink-0"
      style={{ width: 16, height: 16, background: nameToColor(name), fontSize: 6 }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}

const Cs2MatchRow = memo(function Cs2MatchRow({ match, href, lang, tomorrowLabel }: {
  match: EsportsMatch; href: string; lang: 'en' | 'ru'; tomorrowLabel: string
}) {
  const router = useRouter()
  const isLive     = match.status === 'live'
  const isFinished = match.status === 'finished'
  const isUpcoming = match.status === 'upcoming'

  const seriesScoreA = match.games.filter(g => g.teamA?.won).length
  const seriesScoreB = match.games.filter(g => g.teamB?.won).length

  const liveGame   = isLive ? match.games.find(g => g.started && !g.finished) : null
  const currentRound = liveGame?.rounds ? liveGame.rounds.filter(r => r.started).length : null
  const liveMapName  = liveGame?.map ? liveGame.map.toLowerCase() : null
  const liveScoreA   = liveGame?.teamA?.score
  const liveScoreB   = liveGame?.teamB?.score

  const formatLabel = parseFormatLabel(match.format ?? '')
  const aWinsAll = seriesScoreA > seriesScoreB
  const bWinsAll = seriesScoreB > seriesScoreA

  return (
    <Link href={href} prefetch={false} onMouseEnter={() => router.prefetch(href)}
      className="flex items-center cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      style={{
        background: 'rgba(var(--bg-base-rgb), 0.55)',
        backdropFilter: 'blur(2px)',
        borderRadius: 6,
        border: `1px solid ${isLive ? 'rgba(var(--danger),0.18)' : 'rgba(var(--surface-tint-rgb),0.06)'}`,
        borderLeft: isLive ? '2px solid rgb(var(--danger))' : '2px solid transparent',
        opacity: isFinished ? 0.55 : 1,
      }}>

      {/* 1 · Status zone — 42px */}
      <div style={{ width: 42, padding: '8px 0 8px 8px', flexShrink: 0 }}>
        {isLive ? (
          <div className="flex flex-col gap-0.5">
            {currentRound != null && currentRound > 0 && (
              <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: 'rgb(var(--watch))' }}>R{currentRound}</span>
            )}
            <span className="text-[8px] font-mono font-bold tracking-widest uppercase" style={{ color: 'rgb(var(--danger))' }}>LIVE</span>
          </div>
        ) : isFinished ? (
          <span className="text-[8px] font-mono tracking-widest uppercase" style={{ color: 'rgb(var(--text-muted))' }}>FT</span>
        ) : (
          <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-secondary))' }}>
            {formatTime(match.startsAt, lang, tomorrowLabel)}
          </span>
        )}
      </div>

      {/* 2 · Teams zone — flex 1 */}
      <div style={{ flex: 1, padding: '8px', minWidth: 0 }}>
        <div className="flex items-center gap-1.5 mb-1">
          <Cs2TeamLogo logoUrl={match.teamA.logoUrl} name={match.teamA.name} />
          <span className="text-[11px] font-mono truncate"
            style={{ color: isFinished && aWinsAll ? 'rgb(var(--text-primary))' : isFinished && !aWinsAll ? 'rgb(var(--text-muted))' : 'rgb(var(--text-secondary))',
              fontWeight: isFinished && aWinsAll ? 500 : undefined }}>
            {match.teamA.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Cs2TeamLogo logoUrl={match.teamB.logoUrl} name={match.teamB.name} />
          <span className="text-[11px] font-mono truncate"
            style={{ color: isFinished && bWinsAll ? 'rgb(var(--text-primary))' : isFinished && !bWinsAll ? 'rgb(var(--text-muted))' : 'rgb(var(--text-secondary))',
              fontWeight: isFinished && bWinsAll ? 500 : undefined }}>
            {match.teamB.name}
          </span>
        </div>
      </div>

      {/* 3 · Score zone — 90px */}
      <div style={{ width: 90, textAlign: 'center', flexShrink: 0, padding: '8px 4px' }}>
        {isLive ? (
          <>
            <div className="font-mono font-medium tabular-nums" style={{ fontSize: 18, color: 'rgb(var(--danger))' }}>
              {seriesScoreA} : {seriesScoreB}
            </div>
            <div className="text-[8px] font-mono mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
              {formatLabel}{liveGame ? ` · GAME ${liveGame.seq}` : ''}
            </div>
            {liveMapName && liveScoreA != null && liveScoreB != null && (
              <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--watch))' }}>
                {liveMapName} · {liveScoreA}:{liveScoreB}
              </div>
            )}
          </>
        ) : isFinished ? (
          <>
            <div className="font-mono font-medium tabular-nums" style={{ fontSize: 18, color: 'rgb(var(--text-primary))' }}>
              {seriesScoreA} : {seriesScoreB}
            </div>
            <div className="text-[8px] font-mono mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{formatLabel}</div>
          </>
        ) : (
          <>
            <div className="font-mono tabular-nums" style={{ fontSize: 14, color: 'rgb(var(--text-muted))' }}>— : —</div>
            <div className="text-[8px] font-mono mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{formatLabel}</div>
          </>
        )}
      </div>

      {/* 4 · Odds (upcoming) or Game pills (live/finished) */}
      {isUpcoming ? (
        match.yesPrice > 0 && match.yesPrice < 1 ? (
          <div style={{ padding: '8px', flexShrink: 0 }}>
            {[
              { label: abbr(match.teamA.name, 8), pct: match.yesPrice, fav: match.yesPrice > match.noPrice },
              { label: abbr(match.teamB.name, 8), pct: match.noPrice,  fav: match.noPrice > match.yesPrice },
            ].map(({ label, pct, fav }) => (
              <div key={label} className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[8px] font-mono truncate" style={{ width: 48, color: 'rgb(var(--text-muted))' }}>{label}</span>
                <span className="text-[10px] font-mono px-1.5 py-[1px] rounded border tabular-nums"
                  style={fav
                    ? { borderColor: 'rgb(var(--alpha))', color: 'rgb(var(--alpha))', background: 'rgba(var(--alpha),0.08)' }
                    : { borderColor: 'rgba(var(--surface-tint-rgb),0.15)', color: 'rgb(var(--text-secondary))' }}>
                  {(pct * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        ) : null
      ) : match.games.length > 0 ? (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '8px', flexShrink: 0 }}>
          {match.games.map(g => {
            const isActive  = g.started && !g.finished
            const isDone    = g.finished
            const isPending = !g.started && !g.finished
            const aWon = g.teamA?.won
            const bWon = g.teamB?.won
            const sA = g.teamA?.score
            const sB = g.teamB?.score
            return (
              <div key={g.seq} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                padding: '3px 5px', borderRadius: 4,
                border: isActive
                  ? '1px solid rgba(var(--watch),0.55)'
                  : isDone
                    ? (aWon ? '1px solid rgba(var(--alpha),0.35)' : bWon ? '1px solid rgba(var(--danger),0.35)' : '1px solid rgba(var(--surface-tint-rgb),0.12)')
                    : '1px solid rgba(var(--surface-tint-rgb),0.1)',
                opacity: isPending ? 0.4 : 1,
              }}>
                <span className="text-[7px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>G{g.seq}</span>
                <span className="text-[12px] font-mono tabular-nums"
                  style={{ color: isActive ? 'rgb(var(--watch))' : isDone ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.3)' }}>
                  {isActive && sA != null && sB != null ? `${sA}:${sB}` : isDone && sA != null && sB != null ? `${sA}:${sB}` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      ) : null}

      {/* 5 · Arrow */}
      <span className="text-[10px] shrink-0 pr-2" style={{ color: 'rgb(var(--text-muted))' }}>›</span>
    </Link>
  )
})

function Cs2TournamentGroup({ tournament, matches, makeHref, lang, tomorrowLabel, first }: {
  tournament: string; matches: EsportsMatch[]
  makeHref: (m: EsportsMatch) => string; lang: 'en' | 'ru'; tomorrowLabel: string; first: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const liveCount = matches.filter(m => m.status === 'live').length
  return (
    <div>
      <button onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-2 px-3.5 transition-colors hover:bg-white/[0.015]"
        style={{
          minHeight: 34, marginTop: first ? 0 : 16,
          background: 'rgba(var(--surface-tint-rgb),0.04)',
          borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.07)',
        }}>
        <span className="text-[10px] font-mono uppercase tracking-[0.08em] truncate flex-1 text-left"
          style={{ color: 'rgba(var(--surface-tint-rgb),0.5)' }}>
          {tournament}
        </span>
        {liveCount > 0 && (
          <span className="text-[8px] font-mono font-bold shrink-0" style={{ color: 'rgb(var(--danger))' }}>
            ● {liveCount} LIVE
          </span>
        )}
        <span className="text-[10px] font-mono shrink-0 transition-transform duration-150"
          style={{ color: 'rgba(var(--surface-tint-rgb),0.3)', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>
          ›
        </span>
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-1 pt-1">
          {matches.map(m => (
            <Cs2MatchRow key={m.id} match={m} href={makeHref(m)} lang={lang} tomorrowLabel={tomorrowLabel} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Dota 2 row helpers ───────────────────────────────────────────────────────
const D_RADIANT = '#4ade80'
const D_DIRE    = '#ef4444'
const D_AMBER   = '#D4A017'

function DotaGameClock({ secs, ticking }: { secs: number; ticking: boolean }) {
  const [s, setS] = useState(secs)
  useEffect(() => {
    setS(secs)
    if (!ticking) return
    const id = setInterval(() => setS(v => v + 1), 1000)
    return () => clearInterval(id)
  }, [secs, ticking])
  const abs = Math.abs(s)
  const m = Math.floor(abs / 60), sec = abs % 60
  return (
    <span className="text-[10px] font-mono tabular-nums" style={{ color: D_AMBER }}>
      {s < 0 ? '-' : ''}{m}:{String(sec).padStart(2, '0')}
    </span>
  )
}

function DotaTeamLogo({ logo, name, size = 14 }: { logo?: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <div className="shrink-0 overflow-hidden"
      style={{ width: size, height: size, borderRadius: 2, border: '0.5px solid rgba(var(--surface-tint-rgb),0.15)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" loading="lazy" onError={() => setErr(true)}
        style={{ width: size, height: size, objectFit: 'contain' }} />
    </div>
  )
  return (
    <div className="shrink-0 flex items-center justify-center font-mono font-bold"
      style={{ width: size, height: size, borderRadius: 2, background: 'rgba(var(--surface-tint-rgb),0.07)', fontSize: Math.round(size * 0.5), color: 'rgba(var(--surface-tint-rgb),0.4)' }}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  )
}

// ─── Dota 2 match row ─────────────────────────────────────────────────────────
const DotaRow = memo(function DotaRow({ match, href, lang, tomorrowLabel }: {
  match: EsportsMatch; href: string; lang: 'en' | 'ru'; tomorrowLabel: string
}) {
  const router = useRouter()
  const isLive     = match.status === 'live'
  const isFinished = match.status === 'finished'
  const isUpcoming = match.status === 'upcoming'

  const seriesA = match.games.filter(g => g.teamA?.won).length
  const seriesB = match.games.filter(g => g.teamB?.won).length

  const formatStr = (() => {
    const f = String(match.format ?? '').toLowerCase()
    const m2 = f.match(/bo\s*(\d+)/) ?? f.match(/best.?of.?(\d+)/)
    return m2 ? `BO${m2[1]}` : (match.format ?? '').toUpperCase()
  })()

  const liveGame = isLive ? match.games.find(g => g.started && !g.finished) : null
  const killA = liveGame?.teamA?.score ?? liveGame?.teamA?.kills ?? null
  const killB = liveGame?.teamB?.score ?? liveGame?.teamB?.kills ?? null
  const nwA = liveGame?.teamA?.netWorth ?? null
  const nwB = liveGame?.teamB?.netWorth ?? null
  const nwDiff = nwA != null && nwB != null ? nwA - nwB : null

  const teamAWon = isFinished && seriesA > seriesB
  const teamBWon = isFinished && seriesB > seriesA

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={() => router.prefetch(href)}
      className="flex items-stretch cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 overflow-hidden"
      style={{
        background: isLive ? 'rgba(239,68,68,0.025)' : 'rgba(var(--bg-base-rgb),0.55)',
        borderLeft: isLive ? `2px solid ${D_DIRE}` : '2px solid transparent',
        borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.07)',
        minHeight: 50,
      }}
    >
      {/* 1. Status zone — 42px */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-0.5" style={{ width: 42 }}>
        {isLive ? (
          <>
            {liveGame?.clock
              ? <DotaGameClock secs={liveGame.clock.currentSeconds} ticking={liveGame.clock.ticking} />
              : <span className="text-[9px] font-mono animate-pulse" style={{ color: D_AMBER }}>●</span>}
            <span className="text-[8px] font-mono font-bold tracking-wider" style={{ color: D_DIRE }}>LIVE</span>
          </>
        ) : isFinished ? (
          <span className="text-[8px] font-mono tracking-widest" style={{ color: 'rgba(var(--surface-tint-rgb),0.3)' }}>FT</span>
        ) : (
          <span className="text-[10px] font-mono text-center leading-tight px-1" style={{ color: 'rgba(var(--surface-tint-rgb),0.5)' }}>
            {formatTime(match.startsAt, lang, tomorrowLabel)}
          </span>
        )}
      </div>

      {/* 2. Teams zone — flex 1 */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 py-2 px-1.5">
        {([
          { name: match.teamA.name, logo: match.teamA.logoUrl, won: teamAWon, isA: true },
          { name: match.teamB.name, logo: match.teamB.logoUrl, won: teamBWon, isA: false },
        ] as const).map(({ name, logo, won, isA }) => (
          <div key={name} className="flex items-center gap-1">
            {isLive && (
              <div className="shrink-0 rounded-full" style={{ width: 3, height: 10, background: isA ? D_RADIANT : D_DIRE }} />
            )}
            <DotaTeamLogo logo={logo} name={name} size={14} />
            <span className="text-[11px] font-mono truncate"
              style={{
                color: isFinished
                  ? (won ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.38)')
                  : 'rgb(var(--text-secondary))',
                fontWeight: won ? 500 : 400,
              }}>
              {name}
            </span>
          </div>
        ))}
      </div>

      {/* 3. Score zone — 90px */}
      <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 px-1" style={{ width: 90 }}>
        {isLive && killA != null && killB != null ? (
          <>
            <span className="font-mono font-medium tabular-nums leading-none" style={{ fontSize: 18, color: D_DIRE }}>
              {killA} : {killB}
            </span>
            <span className="text-[8px] font-mono" style={{ color: 'rgba(var(--surface-tint-rgb),0.3)' }}>
              {formatStr}{liveGame?.seq ? ` · GAME ${liveGame.seq}` : ''}
            </span>
            {nwDiff != null && Math.abs(nwDiff) >= 100 && (
              <span className="text-[9px] font-mono tabular-nums" style={{ color: nwDiff > 0 ? D_RADIANT : D_DIRE }}>
                NW {nwDiff > 0 ? '+' : '−'}{(Math.abs(nwDiff) / 1000).toFixed(1)}k
              </span>
            )}
          </>
        ) : isFinished ? (
          <>
            <span className="font-mono font-medium tabular-nums leading-none" style={{ fontSize: 18, color: 'rgb(var(--text-primary))' }}>
              {seriesA} : {seriesB}
            </span>
            <span className="text-[8px] font-mono" style={{ color: 'rgba(var(--surface-tint-rgb),0.3)' }}>{formatStr}</span>
          </>
        ) : (
          <>
            <span className="font-mono" style={{ fontSize: 14, color: 'rgba(var(--surface-tint-rgb),0.3)' }}>— : —</span>
            <span className="text-[8px] font-mono" style={{ color: 'rgba(var(--surface-tint-rgb),0.25)' }}>{formatStr}</span>
          </>
        )}
      </div>

      {/* 4. Games pills (live/finished) or odds (upcoming) — sm+ only */}
      {!isUpcoming && match.games.length > 0 && (
        <div className="shrink-0 hidden sm:flex items-center gap-1 px-1.5">
          {match.games.map(g => {
            const gLive = g.started && !g.finished
            const gFin  = g.finished
            const aPend = !g.started
            const sA = g.teamA?.score ?? g.teamA?.kills
            const sB = g.teamB?.score ?? g.teamB?.kills
            const hasScore = sA != null && sB != null
            let bdr = 'rgba(var(--surface-tint-rgb),0.14)'
            if (gLive) bdr = D_AMBER
            else if (gFin && g.teamA?.won) bdr = D_RADIANT
            else if (gFin && g.teamB?.won) bdr = D_DIRE
            return (
              <div key={g.seq} className="flex flex-col items-center rounded"
                style={{ border: `1px solid ${bdr}`, padding: '2px 5px', opacity: aPend ? 0.35 : 1, minWidth: 26 }}>
                <span className="text-[7px] font-mono leading-none" style={{ color: 'rgba(var(--surface-tint-rgb),0.3)' }}>G{g.seq}</span>
                {hasScore ? (
                  <span className="text-[9px] font-mono tabular-nums leading-none mt-0.5"
                    style={{ color: gLive ? D_AMBER : 'rgb(var(--text-secondary))' }}>
                    {sA}:{sB}
                  </span>
                ) : (
                  <span className="text-[9px] font-mono leading-none mt-0.5" style={{ color: 'rgba(var(--surface-tint-rgb),0.2)' }}>—</span>
                )}
              </div>
            )
          })}
        </div>
      )}
      {isUpcoming && match.yesPrice > 0 && match.yesPrice !== 0.5 && (() => {
        const normTeams = normalizeBinary(match.yesPrice, match.noPrice, `cybersport-match:${match.id}`)
        return (
        <div className="shrink-0 hidden sm:flex flex-col justify-center gap-0.5 px-2">
          {([
            { name: match.teamA.name, pct: normTeams?.yes ?? 0 },
            { name: match.teamB.name, pct: normTeams?.no ?? 0 },
          ] as const).map(({ name, pct }) => (
            <div key={name} className="flex items-center gap-1">
              <span className="text-[9px] font-mono truncate" style={{ maxWidth: 52, color: 'rgba(var(--surface-tint-rgb),0.4)' }}>{name}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded tabular-nums"
                style={pct > 50
                  ? { border: `0.5px solid ${D_RADIANT}55`, color: D_RADIANT, background: `${D_RADIANT}0f` }
                  : { border: '0.5px solid rgba(var(--surface-tint-rgb),0.12)', color: 'rgba(var(--surface-tint-rgb),0.45)' }
                }>
                {pct}%
              </span>
            </div>
          ))}
        </div>
        )
      })()}

      {/* 5. Arrow */}
      <div className="shrink-0 flex items-center px-2">
        <span className="text-[10px] select-none" style={{ color: 'rgba(var(--surface-tint-rgb),0.25)' }}>›</span>
      </div>
    </Link>
  )
})

// ─── EsportsRow ───────────────────────────────────────────────────────────────
const EsportsRow = memo(function EsportsRow({ match, accent, href, lang, tomorrowLabel }: {
  match: EsportsMatch
  accent: string
  href: string
  lang: 'en' | 'ru'
  tomorrowLabel: string
}) {
  const router = useRouter()
  const isLive     = match.status === 'live'
  const isFinished = match.status === 'finished'
  const seriesScoreA = match.games.filter(g => g.teamA?.won).length
  const seriesScoreB = match.games.filter(g => g.teamB?.won).length
  const scoreA = match.teamA.score
  const scoreB = match.teamB.score
  const hasSeriesScore = isLive || isFinished
  const liveGame = isLive ? match.games.find(g => g.started && !g.finished) : null
  const liveGameLabel = liveGame ? (liveGame.map ? `${liveGame.map}` : `Map ${liveGame.seq}`) : null

  return (
    <Link
      href={href}
      prefetch={false}
      onMouseEnter={() => router.prefetch(href)}
      className="rounded-lg px-3.5 py-2 flex items-center gap-3 cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      style={{
        background: 'rgba(var(--bg-base-rgb), 0.55)',
        backdropFilter: 'blur(2px)',
        border: `1px solid ${isLive ? `color-mix(in srgb, ${accent} 16%, transparent)` : 'rgba(var(--surface-tint-rgb),0.06)'}`,
        borderLeft: isLive ? `3px solid ${accent}` : undefined,
      }}
    >
      {/* Status / Time */}
      <div className="shrink-0 w-14 text-center">
        {isLive ? (
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: `color-mix(in srgb, ${accent} 13%, transparent)`, color: accent }}>LIVE</span>
            {scoreA != null && scoreB != null && (
              <span className="text-[11px] font-mono font-bold text-text-primary">
                {scoreA}:{scoreB}
              </span>
            )}
          </div>
        ) : isFinished ? (
          <span className="text-[9px] font-mono text-text-muted">FIN</span>
        ) : (
          <p className="text-[9px] font-mono text-text-muted">{formatTime(match.startsAt, lang, tomorrowLabel)}</p>
        )}
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <span className="text-[13px] font-mono text-text-primary truncate">{abbr(match.teamA.name)}</span>
          <span className="text-[10px] font-mono text-text-muted/70 shrink-0 hidden sm:inline">vs</span>
          <span className="text-[13px] font-mono text-text-primary truncate">{abbr(match.teamB.name)}</span>
        </div>
        <p className="text-[10px] font-mono text-text-muted mt-0.5 truncate">
          {match.format}
          {liveGameLabel && (
            <span className="ml-2 text-text-muted/60">· {liveGameLabel}</span>
          )}
        </p>
      </div>

      {/* Series score (games won) */}
      {hasSeriesScore && (seriesScoreA + seriesScoreB > 0) && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-mono font-bold text-text-primary">
            {seriesScoreA}:{seriesScoreB}
          </p>
        </div>
      )}

      {/* Odds */}
      {match.status !== 'upcoming' && match.yesPrice > 0 && match.yesPrice < 1 && match.yesPrice !== 0.5 && (
        <div className="shrink-0 flex gap-1.5">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-bg-border text-text-secondary">
            {(match.yesPrice * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </Link>
  )
})

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CybersportScreen({ initialGame = 'cs2', matchId, initialMatches, initialMatchData }: { initialGame?: Game; matchId?: string; initialMatches?: EsportsMatch[]; initialMatchData?: unknown }) {
  usePageTitle('Esports')

  const game   = initialGame
  const accent = ACCENT[game]

  const { lang } = useLang()
  const t = useT(lang)
  const tomorrowLabel = t('common.tomorrow_short')

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const initialTw = ((): TimeWin => {
    const v = searchParams?.get('time')
    return (v === 'live' || v === '1h' || v === '3h' || v === '12h' || v === 'all') ? v : 'all'
  })()

  const [timeWin, setTimeWin]       = useState<TimeWin>(initialTw)
  const [currentPage, setCurrentPage] = useState(1)

  const { selectedLeague: activeTournament, setSelectedLeague: setActiveTournament, setLeagues, setLiveCount, setTotalCount } = useLiveLayout()

  const { data, loading } = usePolling<EsportsMatch[]>(
    async () => {
      const res = await api.getEsportsMatches(game, timeWin)
      return (res as { matches?: EsportsMatch[] })?.matches ?? []
    },
    REFRESH_INTERVAL,
    'esports:matches', game, timeWin,
    // Seed first paint from SSR only when filter matches the SSR window
    ...(initialMatches && timeWin === 'all' ? [{ initialData: initialMatches }] : []),
  )
  const matches = useMemo(() => (data ?? []).filter(m => !isTestMatch(m)), [data])

  // Loader visibility: show until data for the *current* filter has arrived.
  // usePolling doesn't reset its `loading` flag on dep change, so on filter
  // switches the underlying flag stays false — we track which filter the
  // currently-displayed data belongs to and treat any mismatch as loading.
  const filterKey = `${game}:${timeWin}`
  // Lazy init: if SSR seeded data into the cache, dataKey starts in-sync with
  // filterKey so the very first render shows matches (not the loader).
  // Otherwise hydration renders PrescioLoader, then useEffect updates state
  // and re-renders the list — a visible double-render flash.
  const [dataKey, setDataKey] = useState<string | null>(() =>
    data !== null ? filterKey : null
  )
  useEffect(() => {
    if (data !== null) setDataKey(filterKey)
  }, [data, filterKey])
  const showLoader = useLoaderMinHold(loading || dataKey !== filterKey)

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1) }, [game, timeWin, activeTournament])
  useEffect(() => { setActiveTournament(null) }, [game]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync filters to URL (?time=…&tournament=…) — shareable links
  useEffect(() => {
    if (matchId) return
    const params = new URLSearchParams()
    if (timeWin !== 'all') params.set('time', timeWin)
    if (activeTournament) params.set('tournament', activeTournament)
    const qs = params.toString()
    const url = qs ? `${pathname}?${qs}` : pathname
    router.replace(url, { scroll: false })
  }, [timeWin, activeTournament, matchId, pathname, router])

  // Apply ?tournament= from URL once matches arrive
  const tournamentFromUrl = searchParams?.get('tournament') ?? null
  useEffect(() => {
    if (matchId) return
    if (!tournamentFromUrl) return
    if (activeTournament === tournamentFromUrl) return
    if (matches.some(m => m.tournament === tournamentFromUrl)) {
      setActiveTournament(tournamentFromUrl)
    }
  }, [tournamentFromUrl, matches, matchId]) // eslint-disable-line react-hooks/exhaustive-deps


  // Sidebar
  const allGroups = useMemo(() => groupByTournament(matches), [matches])
  const tournaments = useMemo(() => allGroups.map(g => ({ name: g.tournament })), [allGroups])
  const liveCount   = useMemo(() => matches.filter(m => m.status === 'live').length, [matches])

  useEffect(() => { setLeagues(tournaments) }, [tournaments]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLiveCount(liveCount) }, [liveCount]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTotalCount(matches.length) }, [matches.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Filtering
  const filteredGroups = useMemo(() => {
    if (!activeTournament) return allGroups
    return allGroups.filter(g => g.tournament === activeTournament)
  }, [allGroups, activeTournament])

  const pageGroups = useMemo(
    () => paginateGroups(filteredGroups, currentPage),
    [filteredGroups, currentPage]
  )

  const total  = totalMatches(filteredGroups)
  const pages  = Math.ceil(total / EVENTS_PER_PAGE)

  // Event range for pagination display
  const eventsBefore = (currentPage - 1) * EVENTS_PER_PAGE
  const eventsOnPage = pageGroups.reduce((s, g) => s + g.matches.length, 0)
  const pageStart    = total > 0 ? eventsBefore + 1 : 0
  const pageEnd      = eventsBefore + eventsOnPage

  return (
    <ErrorBoundary>
      <main className="flex-1 min-w-0 px-3 sm:px-4 md:px-6 pb-5 pt-0">

        {/* Time filter bar */}
        {!matchId && (
          <div className="dota-filters sport-sticky-header flex items-center gap-1.5 mb-4 pt-3 -mx-3 sm:-mx-4 md:-mx-6 px-3 sm:px-4 md:px-6"
            data-discipline={game}
            style={{ position: 'sticky', zIndex: 15, background: 'rgba(var(--bg-base-rgb), 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            {(['live', '1h', '3h', '12h', 'all'] as TimeWin[]).map(tw => (
              <button
                key={tw}
                onClick={() => { setTimeWin(tw); setCurrentPage(1) }}
                data-active={timeWin === tw ? 'true' : 'false'}
                className="px-2.5 py-1 rounded text-[9px] font-mono font-bold tracking-wider uppercase transition-all"
                style={timeWin === tw
                  ? { background: `color-mix(in srgb, ${accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${accent} 33%, transparent)`, color: accent }
                  : { background: 'transparent', border: '1px solid rgba(var(--surface-tint-rgb),0.08)', color: 'rgb(var(--text-secondary))' }
                }
              >
                {TIME_LABELS[tw]}
              </button>
            ))}
            {liveCount > 0 && (
              <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase"
                style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.25)', color: '#ff5252' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {liveCount} Live
              </div>
            )}
          </div>
        )}

        {/* Embedded match detail */}
        {matchId ? (
          game === 'dota2'
            ? <DotaMatchScreen seriesId={matchId} initialData={initialMatchData as import('../types').EsportsMatchDetail | undefined} />
            : <CS2MatchScreen  seriesId={matchId} initialData={initialMatchData as import('../types').EsportsMatchDetail | undefined} />
        ) : (
          <>
            {activeTournament && !showLoader && (
              <ActiveFilterBanner
                value={activeTournament}
                onClear={() => setActiveTournament(null)}
                showIcon={false}
              />
            )}

            {/* Loading + empty share the same rhombus mark — when fetch ends
                with no data the spin just stops in place and the label swaps,
                so the brand mark stays visible across filter switches. */}
            {(showLoader || matches.length === 0) && (
              <PrescioLoader
                color={accent}
                state={showLoader ? 'loading' : 'idle'}
                label={showLoader ? t('esports.loading_matches') : t('esports.no_matches')}
                sublabel={
                  showLoader
                    ? undefined
                    : timeWin === 'live'
                      ? t('esports.no_live_now')
                      : t('esports.try_time_window')
                }
              />
            )}

            {/* Match list */}
            {!showLoader && pageGroups.length > 0 && (
              <>
                <div className="flex flex-col gap-1.5">
                  {pageGroups.map(({ tournament, matches: ms }, idx) => {
                    const tournLive = ms.filter(m => m.status === 'live').length
                    return game === 'cs2' ? (
                      <Cs2TournamentGroup
                        key={tournament}
                        tournament={tournament}
                        matches={ms}
                        makeHref={m => `/cybersport/${game}/${m.id}`}
                        lang={lang}
                        tomorrowLabel={tomorrowLabel}
                        first={idx === 0}
                      />
                    ) : (
                      <div key={tournament}>
                        <GroupDivider name={tournament} count={ms.length} liveCount={tournLive} first={idx === 0} />
                        <div className="flex flex-col gap-1">
                          {ms.map(m => game === 'dota2'
                            ? <DotaRow key={m.id} match={m} href={`/cybersport/${game}/${m.id}`} lang={lang} tomorrowLabel={tomorrowLabel} />
                            : <EsportsRow key={m.id} match={m} accent={accent} href={`/cybersport/${game}/${m.id}`} lang={lang} tomorrowLabel={tomorrowLabel} />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Pagination
                  current={currentPage}
                  total={pages}
                  totalEvents={total}
                  pageStart={pageStart}
                  pageEnd={pageEnd}
                  accent={accent}
                  onChange={p => {
                    flushSync(() => setCurrentPage(p))
                    scrollLiveContentToTop()
                  }}
                />
              </>
            )}
          </>
        )}
      </main>
    </ErrorBoundary>
  )
}
