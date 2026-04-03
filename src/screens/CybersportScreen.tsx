'use client'
import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { LogoCS2, LogoDota2 } from '../components/icons/games'
import type { EsportsMatch } from '../types'
import DotaMatchScreen from './DotaMatchScreen'
import { useLiveLayout } from '../contexts/LiveLayoutContext'

export type Game = 'cs2' | 'dota2' | 'valorant'
type TimeWin = 'live' | '1h' | '3h' | '12h' | 'all'

// ─── Background textures ──────────────────────────────────────────────────────
const HERO_PAGE_BG: Record<Game, string> = {
  cs2:      'repeating-linear-gradient(90deg,transparent,transparent 43px,rgba(230,100,20,0.016) 43px,rgba(230,100,20,0.016) 44px),#0a0603',
  dota2:    'repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(180,30,30,0.018) 31px,rgba(180,30,30,0.018) 32px),#0a0606',
  valorant: 'repeating-linear-gradient(0deg,transparent,transparent 37px,rgba(255,70,85,0.016) 37px,rgba(255,70,85,0.016) 38px),#0a0506',
}

const GAME_BG: Record<Game, string> = {
  cs2:
    'repeating-linear-gradient(90deg,transparent,transparent 43px,rgba(230,100,20,0.022) 43px,rgba(230,100,20,0.022) 44px),' +
    'radial-gradient(ellipse 700px 400px at 50% -8%,rgba(230,100,20,0.10) 0%,transparent 70%),' +
    '#0a0603',
  dota2:
    'repeating-linear-gradient(0deg,transparent,transparent 31px,rgba(180,30,30,0.022) 31px,rgba(180,30,30,0.022) 32px),' +
    'radial-gradient(ellipse 700px 400px at 50% -8%,rgba(180,30,30,0.10) 0%,transparent 70%),' +
    '#0a0606',
  valorant:
    'repeating-linear-gradient(0deg,transparent,transparent 37px,rgba(255,70,85,0.018) 37px,rgba(255,70,85,0.018) 38px),' +
    'radial-gradient(ellipse 700px 400px at 50% -8%,rgba(255,70,85,0.10) 0%,transparent 70%),' +
    '#0a0506',
}

const ACCENT: Record<Game, string> = {
  cs2:      '#e66414',
  dota2:    '#c0392b',
  valorant: '#ff4655',
}

const TIME_LABELS: Record<TimeWin, string> = {
  live: 'LIVE',
  '1h': '1H',
  '3h': '3H',
  '12h': '12H',
  all: 'ALL',
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

function paginateGroups(
  groups: { tournament: string; matches: EsportsMatch[] }[],
  page: number
): { tournament: string; matches: EsportsMatch[] }[] {
  let skip = (page - 1) * PAGE_SIZE
  let remaining = PAGE_SIZE
  const result: { tournament: string; matches: EsportsMatch[] }[] = []
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

function totalMatches(groups: { tournament: string; matches: EsportsMatch[] }[]) {
  return groups.reduce((s, g) => s + g.matches.length, 0)
}

function Pagination({ current, total, onChange, accent }: {
  current: number; total: number; onChange: (p: number) => void; accent: string
}) {
  if (total <= 1) return null
  const pages: (number | '...')[] = []
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i)
  } else {
    pages.push(1)
    if (current > 3) pages.push('...')
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
    if (current < total - 2) pages.push('...')
    pages.push(total)
  }
  return (
    <div className="flex items-center justify-center gap-1 pt-5 pb-2">
      <button onClick={() => onChange(current - 1)} disabled={current === 1}
        className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      {pages.map((p, i) =>
        p === '...'
          ? <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-[10px] font-mono text-text-muted/40">···</span>
          : <button key={p} onClick={() => onChange(p as number)}
              className="w-7 h-7 flex items-center justify-center rounded text-[11px] font-mono transition-all"
              style={p === current
                ? { background: `${accent}18`, color: accent, border: `1px solid ${accent}44` }
                : { color: 'rgb(var(--text-muted))', border: '1px solid transparent' }
              }>{p}</button>
      )}
      <button onClick={() => onChange(current + 1)} disabled={current === total}
        className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string, max = 16) {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (d.getTime() - now.getTime()) / 3_600_000
  if (Math.abs(diffH) < 24) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupByTournament(matches: EsportsMatch[]) {
  const map = new Map<string, EsportsMatch[]>()
  for (const m of matches) {
    const key = m.tournament || 'Other'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries()).map(([tournament, ms]) => ({ tournament, matches: ms }))
}

// ─── TournamentDivider ────────────────────────────────────────────────────────
function TournamentDivider({ name, count, first }: { name: string; count: number; first?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${first ? 'pt-0' : 'pt-4'} pb-1.5`}>
      <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase shrink-0 max-w-[55%] truncate text-text-muted">
        {name}
      </span>
      <div className="flex-1 h-px bg-bg-border" />
      <span className="text-[9px] font-mono shrink-0 px-1.5 py-0.5 rounded border border-bg-border text-text-muted/50">
        {count}
      </span>
    </div>
  )
}

// ─── EsportsRow ───────────────────────────────────────────────────────────────
function EsportsRow({ match, accent, onClick }: {
  match: EsportsMatch
  accent: string
  onClick: () => void
}) {
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const seriesScoreA = match.games.filter(g => g.teamA?.won).length
  const seriesScoreB = match.games.filter(g => g.teamB?.won).length

  return (
    <div
      onClick={onClick}
      className="rounded-lg px-3.5 py-2 flex items-center gap-3 cursor-pointer transition-all"
      style={{
        background: 'rgba(8,8,8,0.55)',
        backdropFilter: 'blur(2px)',
        border: `1px solid ${isLive ? `${accent}28` : 'rgba(255,255,255,0.06)'}`,
        borderLeft: isLive ? `3px solid ${accent}` : undefined,
      }}
    >
      {/* Status */}
      <div className="shrink-0 w-14 text-center">
        {isLive ? (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${accent}22`, color: accent }}>LIVE</span>
        ) : isFinished ? (
          <span className="text-[9px] font-mono text-text-muted">FIN</span>
        ) : (
          <div className="text-center">
            <p className="text-[9px] font-mono text-text-muted">{formatTime(match.startsAt)}</p>
          </div>
        )}
      </div>

      {/* Teams */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-mono text-text-primary truncate">{abbr(match.teamA.name)}</span>
          <span className="text-[10px] font-mono text-text-muted shrink-0">vs</span>
          <span className="text-[13px] font-mono text-text-primary truncate">{abbr(match.teamB.name)}</span>
        </div>
        <p className="text-[10px] font-mono text-text-muted mt-0.5 truncate">{match.format}</p>
      </div>

      {/* Series score */}
      {(isLive || isFinished) && (seriesScoreA + seriesScoreB > 0) && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-mono font-bold text-text-primary">
            {seriesScoreA} : {seriesScoreB}
          </p>
        </div>
      )}

      {/* Odds — показываем только если есть реальные Polymarket данные (не дефолтные 0.5) */}
      {match.yesPrice > 0 && match.yesPrice !== 0.5 && (
        <div className="shrink-0 flex gap-1.5">
          <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-bg-border text-text-secondary">
            {(match.yesPrice * 100).toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CybersportScreen({ initialGame = 'cs2', matchId }: { initialGame?: Game; matchId?: string }) {
  usePageTitle('Esports')
  const router = useRouter()

  const game = initialGame
  const [timeWin, setTimeWin] = useState<TimeWin>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [isStale, setIsStale] = useState(false)

  const { selectedLeague: activeTournament, setSelectedLeague: setActiveTournament, setLeagues, setLiveCount, setTotalCount, setHideHero } = useLiveLayout()

  const fetchMatches = useCallback(
    () => api.getEsportsMatches(game, timeWin),
    [game, timeWin]
  )
  const { data, loading, isRefreshing } = usePolling(fetchMatches, 60_000, game, timeWin)

  useEffect(() => { setIsStale(true) }, [game, timeWin])
  useEffect(() => { if (data !== null) setIsStale(false) }, [data])
  useEffect(() => { setCurrentPage(1) }, [game, timeWin, activeTournament])

  const showSkeleton = loading || isStale
  const allMatches = useMemo<EsportsMatch[]>(
    () => isStale ? [] : ((data as { matches?: EsportsMatch[] } | null)?.matches ?? []),
    [data, isStale]
  )
  const accent = ACCENT[game]

  const allGroups   = useMemo(() => groupByTournament(allMatches), [allMatches])
  const tournaments = useMemo(() => allGroups.map(g => g.tournament), [allGroups])

  const filteredGroups = useMemo(() => {
    if (!activeTournament) return allGroups
    return allGroups.filter(g => g.tournament === activeTournament)
  }, [allGroups, activeTournament])

  const pageGroups = useMemo(
    () => paginateGroups(filteredGroups, currentPage),
    [filteredGroups, currentPage]
  )

  const total     = totalMatches(filteredGroups)
  const liveCount = allMatches.filter(m => m.status === 'live').length

  useEffect(() => { setLeagues(tournaments) }, [tournaments]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLiveCount(liveCount) }, [liveCount]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTotalCount(allMatches.length) }, [allMatches.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setHideHero(!!matchId) }, [matchId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <main className="flex-1 min-w-0 px-6 pb-5 pt-0">
        {/* Time filter bar */}
        {!matchId && (
          <div className="flex items-center gap-1.5 mb-4 pt-3 px-0"
            style={{ position: 'sticky', top: 200, zIndex: 15, background: 'rgba(8,8,8,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24 }}
          >
            {(['live', '1h', '3h', '12h', 'all'] as TimeWin[]).map(tw => (
              <button
                key={tw}
                onClick={() => { setTimeWin(tw); setCurrentPage(1) }}
                className="px-2.5 py-1 rounded text-[9px] font-mono font-bold tracking-wider uppercase transition-all"
                style={timeWin === tw
                  ? { background: `${accent}18`, border: `1px solid ${accent}55`, color: accent }
                  : { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }
                }
              >
                {TIME_LABELS[tw]}
              </button>
            ))}
            {isRefreshing && (
              <svg className="w-3 h-3 animate-spin text-text-muted/40 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            )}
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
          <DotaMatchScreen
            matchId={matchId}
            onBack={() => router.push(`/cybersport/${game}`)}
          />
        ) : (
          <>
            {showSkeleton && (
              <div className="flex flex-col gap-1.5">
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} className="rounded-lg animate-pulse bg-bg-surface border border-bg-border"
                    style={{ height: 56, animationDelay: `${i * 50}ms` }} />
                ))}
              </div>
            )}

            {!showSkeleton && allMatches.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-bg-surface border border-bg-border">
                  <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <p className="text-sm font-mono text-text-muted mb-1">No matches found</p>
                <p className="text-xs font-mono text-text-muted opacity-60">
                  {timeWin === 'live' ? 'No live matches right now' : 'Try a different time window'}
                </p>
              </div>
            )}

            {!showSkeleton && pageGroups.length > 0 && (
              <>
                <div className="flex flex-col gap-1.5">
                  {pageGroups.map(({ tournament, matches }, idx) => (
                    <div key={tournament}>
                      <TournamentDivider name={tournament} count={matches.length} first={idx === 0} />
                      <div className="flex flex-col gap-1">
                        {matches.map(m => (
                          <EsportsRow
                            key={m.id}
                            match={m}
                            accent={accent}
                            onClick={() => router.push(`/cybersport/${game}/${m.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  current={currentPage}
                  total={Math.ceil(total / PAGE_SIZE)}
                  accent={accent}
                  onChange={p => {
                    flushSync(() => setCurrentPage(p))
                    requestAnimationFrame(() => {
                      const el = document.getElementById('live-content')
                      if (!el) return
                      if (el.scrollTop === 0 && el.scrollHeight > el.clientHeight)
                        el.scrollTop = Math.min(80, el.scrollHeight - el.clientHeight)
                      el.scrollTo({ top: 0, behavior: 'smooth' })
                    })
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
