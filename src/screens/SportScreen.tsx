'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { usePageTitle } from '../hooks/usePageTitle'
import { sportApi } from '../lib/api'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { SportEvent, SportOdds, SubscriptionPlan } from '../types/index'
import { useAuthContext } from '../contexts/AuthContext'
import SportEventPage from './SportEventPage'

import { LogoFootball, LogoBasketball, LogoTennis, LogoMMA } from '../components/icons/games'
import { useLiveLayout } from '../contexts/LiveLayoutContext'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Sport = 'football' | 'basketball' | 'tennis' | 'mma'
type TimeWin = 'live' | '1h' | '3h' | '12h' | 'all'

const TIME_LABELS: Record<TimeWin, string> = { live: 'LIVE', '1h': '1H', '3h': '3H', '12h': '12H', all: 'ALL' }

function filterByTimeWin(events: SportEvent[], tw: TimeWin): SportEvent[] {
  if (tw === 'all') return events
  if (tw === 'live') return events.filter(e => e.status === 'live')
  const now = Date.now()
  const hours = tw === '1h' ? 1 : tw === '3h' ? 3 : 12
  const cutoff = now + hours * 3_600_000
  return events.filter(e => e.status === 'live' || new Date(e.starts_at).getTime() <= cutoff)
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORTS: { key: Sport; label: string; icon: React.ReactNode }[] = [
  { key: 'football',   label: 'Football',   icon: <LogoFootball size={16} />   },
  { key: 'basketball', label: 'Basketball', icon: <LogoBasketball size={16} /> },
  { key: 'tennis',     label: 'Tennis',     icon: <LogoTennis size={16} />     },
  { key: 'mma',        label: 'MMA',        icon: <LogoMMA size={16} />        },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
function abbr(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (name ?? '--').slice(0, 2).toUpperCase()
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  if (diff > 0 && diff < 60 * 60_000) return `${Math.round(diff / 60000)}м`
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function extractH2H(odds?: SportOdds[]): { home: number; away: number } | null {
  const h2h = odds?.find(o => o.market_type === 'h2h')
  if (!h2h || h2h.outcomes.length < 2) return null
  const nonDraw = h2h.outcomes.filter(o => o.name !== 'Draw' && o.name !== 'draw')
  if (nonDraw.length < 2) return null
  const raw0 = 100 / nonDraw[0].price
  const raw1 = 100 / nonDraw[1].price
  const sum = raw0 + raw1
  return {
    home: Math.round((raw0 / sum) * 100),
    away: Math.round((raw1 / sum) * 100),
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const EVENTS_PER_PAGE = 25
type LeagueGroup = { league: string; events: SportEvent[] }

function paginateGroups(groups: LeagueGroup[]): LeagueGroup[][] {
  const pages: LeagueGroup[][] = []
  let page: LeagueGroup[] = []
  let count = 0
  for (const g of groups) {
    if (count + g.events.length > EVENTS_PER_PAGE && page.length > 0) {
      pages.push(page)
      page = [g]
      count = g.events.length
    } else {
      page.push(g)
      count += g.events.length
    }
  }
  if (page.length > 0) pages.push(page)
  return pages
}

function Pagination({ current, total, onChange }: {
  current: number; total: number; onChange: (p: number) => void
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
        p === '...' ? (
          <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-[10px] font-mono text-text-muted/40">···</span>
        ) : (
          <button key={p} onClick={() => onChange(p as number)}
            className="w-7 h-7 flex items-center justify-center rounded text-[11px] font-mono transition-all"
            style={p === current
              ? { background: 'rgba(0,200,150,0.1)', color: 'var(--accent)', border: '1px solid rgba(0,200,150,0.25)' }
              : { color: 'rgb(var(--text-muted))', border: '1px solid transparent' }
            }>{p}</button>
        )
      )}
      <button onClick={() => onChange(current + 1)} disabled={current === total}
        className="w-7 h-7 flex items-center justify-center rounded text-text-muted hover:text-text-primary transition-colors disabled:opacity-25 disabled:cursor-not-allowed">
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  )
}

// ─── League grouping ──────────────────────────────────────────────────────────
function groupByLeague(events: SportEvent[]): LeagueGroup[] {
  const map = new Map<string, SportEvent[]>()
  for (const e of events) {
    const key = e.league || e.subcategory || 'Unknown'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries())
    .map(([league, events]) => ({ league, events }))
    .sort((a, b) => {
      const aLive = a.events.some(e => e.status === 'live')
      const bLive = b.events.some(e => e.status === 'live')
      if (aLive && !bLive) return -1
      if (!aLive && bLive) return 1
      const aMin = Math.min(...a.events.map(e => new Date(e.starts_at).getTime()))
      const bMin = Math.min(...b.events.map(e => new Date(e.starts_at).getTime()))
      return aMin - bMin
    })
}

function LeagueDivider({ name, count, first }: { name: string; count: number; first?: boolean }) {
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

// ─── Match Row ────────────────────────────────────────────────────────────────
function SportRow({ event, onClick }: { event: SportEvent; onClick?: () => void }) {
  const isLive     = event.status === 'live'
  const isFinished = event.status === 'finished'
  const hasScore   = event.home_score != null && event.away_score != null

  const odds = extractH2H(event.sport_odds)
  const pctHome = odds?.home ?? null
  const pctAway = odds?.away ?? null

  const abbrHome = abbr(event.home_team)
  const abbrAway = abbr(event.away_team)

  return (
    <div
      onClick={onClick}
      className="grid items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all group relative overflow-hidden"
      style={{
        gridTemplateColumns: '58px 1fr 120px',
        cursor: onClick ? 'pointer' : undefined,
        background: 'rgba(8,8,8,0.55)',
        backdropFilter: 'blur(2px)',
        border: `1px solid ${isLive ? 'rgba(255,50,50,0.2)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-lg"
        style={{ background: isLive ? '#ff5252' : 'transparent' }} />
      <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: isLive ? 'transparent' : 'var(--accent)' }} />

      {/* Time */}
      <div className="flex flex-col items-center gap-1 pl-1.5">
        {isLive ? (
          <>
            {hasScore && (
              <span className="text-[11px] font-mono text-text-primary">
                {event.home_score}:{event.away_score}
              </span>
            )}
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: 'rgba(255,50,50,0.12)', color: '#ff5252' }}>
              Live
            </span>
          </>
        ) : isFinished && hasScore ? (
          <>
            <span className="text-[11px] font-mono text-text-primary">
              {event.home_score}:{event.away_score}
            </span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              Fin
            </span>
          </>
        ) : (
          <>
            <span className="text-[11px] font-mono text-text-primary leading-tight">
              {formatTime(event.starts_at)}
            </span>
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider text-text-muted"
              style={{ background: 'rgba(255,255,255,0.05)' }}>
              сег
            </span>
          </>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center min-w-0">
        {/* Home team */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 bg-bg-elevated border border-bg-border text-text-muted">
            {abbrHome}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-text-primary truncate leading-tight">
              {event.home_team}
            </p>
            {event.league && (
              <p className="text-[9px] font-mono text-text-muted/60 truncate">{event.league}</p>
            )}
          </div>
        </div>

        {/* VS + prob bar */}
        <div className="flex flex-col items-center px-3 shrink-0 gap-1.5">
          <span className="text-[9px] font-mono text-text-muted/50 tracking-wider">VS</span>
          {pctHome != null ? (
            <div className="flex w-[72px] h-[3px] rounded-full overflow-hidden bg-bg-elevated">
              <div className="h-full transition-all duration-500 rounded-full"
                style={{ width: `${pctHome}%`, background: 'var(--accent)' }} />
            </div>
          ) : (
            <div className="w-[72px] h-[3px] rounded-full bg-bg-elevated/50" />
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center gap-2 flex-1 min-w-0 flex-row-reverse">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 bg-bg-elevated border border-bg-border text-text-muted">
            {abbrAway}
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[13px] font-semibold text-text-primary truncate leading-tight">
              {event.away_team}
            </p>
          </div>
        </div>
      </div>

      {/* Odds */}
      <div className="flex gap-1 justify-end">
        {pctHome != null && pctAway != null ? (
          <>
            <div
              className="flex flex-col items-center min-w-[46px] px-2 py-1.5 rounded-md border bg-bg-elevated transition-all"
              style={pctHome >= pctAway
                ? { borderColor: 'rgba(0,200,150,0.3)' }
                : { borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <span className="text-[8px] text-text-muted uppercase tracking-wide mb-0.5">{abbrHome}</span>
              <span className="text-[12px] font-mono font-medium"
                style={{ color: pctHome >= pctAway ? 'var(--accent)' : undefined }}>
                {pctHome}%
              </span>
            </div>
            <div
              className="flex flex-col items-center min-w-[46px] px-2 py-1.5 rounded-md border bg-bg-elevated transition-all"
              style={pctAway > pctHome
                ? { borderColor: 'rgba(0,200,150,0.3)' }
                : { borderColor: 'rgba(255,255,255,0.06)' }}
            >
              <span className="text-[8px] text-text-muted uppercase tracking-wide mb-0.5">{abbrAway}</span>
              <span className="text-[12px] font-mono font-medium"
                style={{ color: pctAway > pctHome ? 'var(--accent)' : undefined }}>
                {pctAway}%
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-w-[96px] px-2 py-1.5 rounded-md border border-bg-border bg-bg-elevated">
            <span className="text-[9px] font-mono text-text-muted/50">No odds</span>
          </div>
        )}
      </div>
    </div>
  )
}
// ─── Main screen ──────────────────────────────────────────────────────────────
export function SportScreen({ initialSport, eventId }: { initialSport?: Sport; eventId?: string } = {}) {
  usePageTitle('Sport')
  const router = useRouter()
  const { profile } = useAuthContext()
  const _plan = (profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')) as SubscriptionPlan

  const sport = initialSport ?? 'football'
  const [timeWin, setTimeWin] = useState<TimeWin>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const { selectedLeague, setSelectedLeague, setLeagues, setLiveCount, setTotalCount } = useLiveLayout()

  const SPORT_ACCENT: Record<Sport, string> = {
    football:   '#e8c032',
    basketball: '#e66414',
    tennis:     '#4d9fff',
    mma:        '#e02020',
  }

  const { data, loading, isRefreshing } = usePolling(
    () => sportApi.getEvents({
      subcategory: sport,
      limit: 200,
    }),
    60_000,
    sport,
  )

  const [isStale, setIsStale] = useState(false)
  useEffect(() => { setIsStale(true) }, [sport])
  useEffect(() => { if (data !== null) setIsStale(false) }, [data])
  useEffect(() => { setCurrentPage(1) }, [sport, timeWin, selectedLeague])

  const showSkeleton = loading || isStale
  const events = useMemo<SportEvent[]>(
    () => isStale ? [] : ((data as { events?: SportEvent[] } | null)?.events ?? []),
    [data, isStale]
  )
  const liveCount = events.filter(e => e.status === 'live').length

  const leagues = useMemo(
    () => Array.from(new Set(events.map(e => e.league || e.subcategory || '').filter(Boolean))).sort(),
    [events]
  )

  useEffect(() => { setLeagues(leagues) }, [leagues]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setLiveCount(liveCount) }, [liveCount]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setTotalCount(events.length) }, [events.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEvents = useMemo(() => {
    let result = selectedLeague
      ? events.filter(e => (e.league || e.subcategory || '') === selectedLeague)
      : events
    result = filterByTimeWin(result, timeWin)
    return result
  }, [events, selectedLeague, timeWin])

  const allGroups  = groupByLeague(filteredEvents)
  const pages      = paginateGroups(allGroups)
  const totalPages = pages.length
  const pageGroups = pages[currentPage - 1] ?? []

  const sportLabel = SPORTS.find(s => s.key === sport)?.label ?? 'Sport'
  const accent = SPORT_ACCENT[sport]

  return (
    <ErrorBoundary>
      <main className="flex-1 min-w-0 px-6 pb-5 pt-0">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-5">
          <h1 className="text-xl font-bold tracking-wider uppercase text-text-primary" style={{ fontFamily: 'var(--font-sans)' }}>
            {sportLabel}
          </h1>
          {liveCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-wider uppercase"
              style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.25)', color: '#ff5252' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {liveCount} Live
            </div>
          )}
          {isRefreshing && (
            <svg className="w-3 h-3 animate-spin text-text-muted/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          )}
          <div className="ml-auto flex items-center gap-1">
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
          </div>
        </div>

        {/* Content: event detail or list */}
        {eventId ? (
          <SportEventPage
            id={eventId}
            onBack={() => router.push(`/sport/${sport}`)}
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

            {!showSkeleton && events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-bg-surface border border-bg-border">
                  <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                </div>
                <p className="text-sm font-mono text-text-muted">События не найдены</p>
                <p className="text-xs font-mono text-text-muted/50 mt-1">Данные синхронизируются</p>
              </div>
            )}

            {!showSkeleton && events.length > 0 && (
              <>
                <div className="flex flex-col">
                  {pageGroups.map(({ league, events: group }, idx) => (
                    <div key={league}>
                      <LeagueDivider name={league} count={group.length} first={idx === 0} />
                      <div className="flex flex-col gap-1">
                        {group.map(e => (
                          <SportRow
                            key={e.id}
                            event={e}
                            onClick={() => router.push(`/sport/${sport}/${e.id}`)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <Pagination
                  current={currentPage}
                  total={totalPages}
                  onChange={p => { setCurrentPage(p); document.getElementById('live-content')?.scrollTo({ top: 0, behavior: 'smooth' }) }}
                />
              </>
            )}
          </>
        )}

      </main>
    </ErrorBoundary>
  )
}
