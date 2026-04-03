'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { flushSync } from 'react-dom'
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
type DateFilter = 'live' | 'today' | 'tomorrow' | 'all'

const DATE_LABELS: Record<DateFilter, string> = {
  live: 'Live',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  all: 'Все',
}

function isTodayLocal(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

function isTomorrowLocal(iso: string): boolean {
  const d = new Date(iso)
  const tmr = new Date()
  tmr.setDate(tmr.getDate() + 1)
  return d.getFullYear() === tmr.getFullYear() && d.getMonth() === tmr.getMonth() && d.getDate() === tmr.getDate()
}

function filterByDate(events: SportEvent[], df: DateFilter): SportEvent[] {
  if (df === 'all') return events
  if (df === 'live') return events.filter(e => e.status === 'live')
  if (df === 'today') return events.filter(e => e.status === 'live' || isTodayLocal(e.starts_at))
  if (df === 'tomorrow') return events.filter(e => isTomorrowLocal(e.starts_at))
  return events
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPORTS: { key: Sport; label: string; icon: React.ReactNode }[] = [
  { key: 'football',   label: 'Football',   icon: <LogoFootball size={16} />   },
  { key: 'basketball', label: 'Basketball', icon: <LogoBasketball size={16} /> },
  { key: 'tennis',     label: 'Tennis',     icon: <LogoTennis size={16} />     },
  { key: 'mma',        label: 'MMA',        icon: <LogoMMA size={16} />        },
]

const SPORT_ACCENT: Record<Sport, string> = {
  football:   '#e8c032',
  basketball: '#e66414',
  tennis:     '#C8E63C',
  mma:        '#e02020',
}

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

// Odds extraction
interface Odds3Way { home: number; draw: number | null; away: number }
interface Odds2Way { home: number; away: number }

function extractOdds(odds?: SportOdds[], sport?: Sport): Odds3Way | null {
  const h2h = odds?.find(o => o.market_type === 'h2h')
  if (!h2h || h2h.outcomes.length < 2) return null

  const homeOut = h2h.outcomes.find(o => {
    const n = o.name.toLowerCase()
    return n === 'home' || n === '1'
  })
  const awayOut = h2h.outcomes.find(o => {
    const n = o.name.toLowerCase()
    return n === 'away' || n === '2'
  })
  const drawOut = h2h.outcomes.find(o => {
    const n = o.name.toLowerCase()
    return n === 'draw' || n === 'x'
  })

  // Fallback: use first two non-draw
  const nonDraw = h2h.outcomes.filter(o => {
    const n = o.name.toLowerCase()
    return n !== 'draw' && n !== 'x'
  })

  const home = homeOut ?? nonDraw[0]
  const away = awayOut ?? nonDraw[1]
  if (!home || !away) return null

  const rawHome = 100 / home.price
  const rawAway = 100 / away.price
  const rawDraw = drawOut && sport === 'football' ? 100 / drawOut.price : null

  const sum = rawHome + rawAway + (rawDraw ?? 0)
  return {
    home: Math.round((rawHome / sum) * 100),
    draw: rawDraw != null ? Math.round((rawDraw / sum) * 100) : null,
    away: Math.round((rawAway / sum) * 100),
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const EVENTS_PER_PAGE = 30
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

function Pagination({ current, total, onChange, accent }: {
  current: number; total: number; onChange: (p: number) => void; accent?: string
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
  const a = accent ?? 'rgba(0,200,150,1)'
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
              ? { background: `${a}18`, color: a, border: `1px solid ${a}44` }
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

function LeagueDivider({ name, count, liveCount, first }: {
  name: string; count: number; liveCount: number; first?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 ${first ? 'pt-0' : 'pt-5'} pb-1.5`}>
      <span className="text-[10px] font-mono font-bold tracking-[0.1em] uppercase shrink-0 max-w-[55%] truncate text-text-muted">
        {name}
      </span>
      {liveCount > 0 && (
        <span className="flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ background: 'rgba(255,50,50,0.1)', color: '#ff5252', border: '1px solid rgba(255,50,50,0.2)' }}>
          <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
          {liveCount}
        </span>
      )}
      <div className="flex-1 h-px bg-bg-border" />
      <span className="text-[9px] font-mono shrink-0 px-1.5 py-0.5 rounded border border-bg-border text-text-muted/50">
        {count}
      </span>
    </div>
  )
}

// ─── Team logo (list) ─────────────────────────────────────────────────────────
function TeamLogo({ logo, abbr, size, accent }: { logo?: string | null; abbr: string; size: number; accent: string }) {
  const [err, setErr] = useState(false)
  if (logo && !err) return (
    <div className="shrink-0 flex items-center justify-center rounded overflow-hidden border border-bg-border"
      style={{ width: size, height: size, background: `${accent}08` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" onError={() => setErr(true)} style={{ width: size * 0.8, height: size * 0.8, objectFit: 'contain' }} />
    </div>
  )
  return (
    <div className="shrink-0 flex items-center justify-center rounded text-[8px] font-bold bg-bg-elevated border border-bg-border text-text-muted"
      style={{ width: size, height: size }}>
      {abbr}
    </div>
  )
}

// ─── Odds bar ─────────────────────────────────────────────────────────────────
function OddsBar({ odds, accent, sport }: { odds: Odds3Way; accent: string; sport: Sport }) {
  const showDraw = sport === 'football' && odds.draw != null
  const homeW = odds.home
  const drawW = odds.draw ?? 0
  const awayW = odds.away

  const homeWins = odds.home > odds.away
  const awayWins = odds.away > odds.home

  return (
    <div className="flex gap-1 items-stretch">
      {/* Home */}
      <div
        className="flex flex-col items-center px-2 py-1.5 rounded-md border transition-all min-w-[42px]"
        style={homeWins
          ? { borderColor: `${accent}55`, background: `${accent}10` }
          : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }
        }
      >
        <span className="text-[7px] font-mono text-text-muted/60 uppercase tracking-wide mb-0.5">H</span>
        <span className="text-[12px] font-mono font-semibold leading-none"
          style={{ color: homeWins ? accent : 'rgba(255,255,255,0.55)' }}>
          {homeW}%
        </span>
      </div>

      {/* Draw (football only) */}
      {showDraw && (
        <div
          className="flex flex-col items-center px-2 py-1.5 rounded-md border transition-all min-w-[38px]"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
        >
          <span className="text-[7px] font-mono text-text-muted/60 uppercase tracking-wide mb-0.5">D</span>
          <span className="text-[12px] font-mono font-semibold leading-none text-text-muted/70">
            {drawW}%
          </span>
        </div>
      )}

      {/* Away */}
      <div
        className="flex flex-col items-center px-2 py-1.5 rounded-md border transition-all min-w-[42px]"
        style={awayWins
          ? { borderColor: `${accent}55`, background: `${accent}10` }
          : { borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }
        }
      >
        <span className="text-[7px] font-mono text-text-muted/60 uppercase tracking-wide mb-0.5">A</span>
        <span className="text-[12px] font-mono font-semibold leading-none"
          style={{ color: awayWins ? accent : 'rgba(255,255,255,0.55)' }}>
          {awayW}%
        </span>
      </div>
    </div>
  )
}

// ─── Match Row ────────────────────────────────────────────────────────────────
function SportRow({ event, sport, accent, onClick }: {
  event: SportEvent; sport: Sport; accent: string; onClick?: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const isLive     = event.status === 'live'
  const isFinished = event.status === 'finished'
  const hasScore   = event.home_score != null && event.away_score != null

  // Elapsed time from raw_data
  const elapsed = (event.raw_data as Record<string, unknown> | null)?.elapsed as number | null | undefined

  const odds = extractOdds(event.sport_odds, sport)

  const abbrHome = abbr(event.home_team)
  const abbrAway = abbr(event.away_team)
  const raw = event.raw_data as Record<string, unknown> | null
  const homeLogo = raw?.home_logo as string | null | undefined
  const awayLogo = raw?.away_logo as string | null | undefined

  // Win probability bar width
  const homeBarPct = odds ? (odds.draw != null ? odds.home : odds.home) : null

  function handleClick() {
    if (onClick) {
      onClick()
    }
  }

  function handleExpand(e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(v => !v)
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${isLive ? 'rgba(255,50,50,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
      {/* Main row */}
      <div
        onClick={handleClick}
        className="grid items-center gap-3 px-3.5 py-2.5 transition-all group relative"
        style={{
          gridTemplateColumns: '60px 1fr auto',
          cursor: onClick ? 'pointer' : undefined,
          background: isLive ? 'rgba(255,50,50,0.04)' : 'rgba(8,8,8,0.55)',
          backdropFilter: 'blur(2px)',
        }}
      >
        {/* Left accent bar */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px]"
          style={{ background: isLive ? '#ff5252' : 'transparent' }} />
        <div className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: isLive ? 'transparent' : accent }} />

        {/* Time / Score */}
        <div className="flex flex-col items-center gap-0.5 pl-1.5">
          {isLive ? (
            <>
              {hasScore && (
                <span className="text-[13px] font-mono font-bold text-text-primary leading-none">
                  {event.home_score}:{event.away_score}
                </span>
              )}
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[9px] font-mono font-bold" style={{ color: '#ff5252' }}>
                  {elapsed != null ? `${elapsed}'` : 'Live'}
                </span>
              </div>
            </>
          ) : isFinished && hasScore ? (
            <>
              <span className="text-[13px] font-mono font-bold text-text-primary leading-none">
                {event.home_score}:{event.away_score}
              </span>
              <span className="text-[8px] font-mono text-text-muted/40 uppercase">Fin</span>
            </>
          ) : (
            <>
              <span className="text-[12px] font-mono text-text-primary leading-none">
                {formatTime(event.starts_at)}
              </span>
              <span className="text-[8px] font-mono text-text-muted/40 uppercase">
                {isTomorrowLocal(event.starts_at) ? 'Завтра' : ''}
              </span>
            </>
          )}
        </div>

        {/* Teams */}
        <div className="flex flex-col gap-1.5 min-w-0">
          {/* Win probability bar */}
          {homeBarPct != null && (
            <div className="flex w-full h-[2px] rounded-full overflow-hidden bg-bg-elevated/60">
              <div className="h-full transition-all duration-500"
                style={{ width: `${homeBarPct}%`, background: accent, opacity: 0.7 }} />
            </div>
          )}
          {/* Rich data indicator */}
          {!homeLogo && (
            <div className="absolute right-10 top-1.5 w-1.5 h-1.5 rounded-full bg-bg-border opacity-50" title="Базовые данные" />
          )}
          {/* Home */}
          <div className="flex items-center gap-2 min-w-0">
            <TeamLogo logo={homeLogo} abbr={abbrHome} size={24} accent={accent} />
            <span className="text-[13px] font-semibold text-text-primary truncate leading-tight">
              {event.home_team}
            </span>
          </div>
          {/* Away */}
          <div className="flex items-center gap-2 min-w-0">
            <TeamLogo logo={awayLogo} abbr={abbrAway} size={24} accent={accent} />
            <span className="text-[13px] font-semibold text-text-primary truncate leading-tight">
              {event.away_team}
            </span>
          </div>
        </div>

        {/* Odds + expand */}
        <div className="flex items-center gap-2 shrink-0">
          {odds ? (
            <OddsBar odds={odds} accent={accent} sport={sport} />
          ) : (
            <div className="flex items-center justify-center px-3 py-1.5 rounded-md border border-bg-border bg-bg-elevated min-w-[90px]">
              <span className="text-[9px] font-mono text-text-muted/40">Нет коэф.</span>
            </div>
          )}

          {/* Expand toggle */}
          <button
            onClick={handleExpand}
            className="w-6 h-6 flex items-center justify-center rounded text-text-muted/40 hover:text-text-muted transition-colors shrink-0"
          >
            <svg className="w-3 h-3 transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 py-3 border-t border-bg-border/50 bg-bg-elevated/30">
          <MatchDetail event={event} sport={sport} accent={accent} />
        </div>
      )}
    </div>
  )
}

// ─── Match detail (expanded) ──────────────────────────────────────────────────
function MatchDetail({ event, sport, accent }: { event: SportEvent; sport: Sport; accent: string }) {
  const allOdds = event.sport_odds ?? []

  if (allOdds.length === 0) {
    return (
      <div className="flex items-center justify-center py-3">
        <span className="text-[10px] font-mono text-text-muted/40">Коэффициенты недоступны</span>
      </div>
    )
  }

  // Group by market_type
  const byMarket = new Map<string, SportOdds[]>()
  for (const o of allOdds) {
    if (!byMarket.has(o.market_type)) byMarket.set(o.market_type, [])
    byMarket.get(o.market_type)!.push(o)
  }

  const MARKET_LABELS: Record<string, string> = {
    h2h: sport === 'football' ? '1X2' : 'Победитель',
    spreads: 'Форы',
    totals: 'Тотал',
    btts: 'Обе забьют',
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Event meta */}
      <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted/50">
        {event.league && <span>{event.league}</span>}
        {(event.raw_data as Record<string, unknown> | null)?.season != null && (
          <>
            <span className="text-text-muted/20">·</span>
            <span>Сезон {String((event.raw_data as Record<string, unknown>).season)}</span>
          </>
        )}
        <span className="text-text-muted/20">·</span>
        <span>{new Date(event.starts_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
      </div>

      {/* Markets */}
      <div className="flex flex-col gap-2">
        {Array.from(byMarket.entries()).map(([marketType, marketOdds]) => (
          <div key={marketType}>
            <p className="text-[8px] font-mono font-bold tracking-[0.1em] uppercase text-text-muted/40 mb-1">
              {MARKET_LABELS[marketType] ?? marketType}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {marketOdds.flatMap(m => m.outcomes).map((outcome, i) => (
                <div key={i}
                  className="flex flex-col items-center px-2.5 py-1.5 rounded border min-w-[52px]"
                  style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}
                >
                  <span className="text-[9px] font-mono text-text-muted/50 truncate max-w-[80px] text-center leading-tight mb-0.5">
                    {outcome.name}
                  </span>
                  <span className="text-[13px] font-mono font-semibold" style={{ color: accent }}>
                    {outcome.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
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
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [currentPage, setCurrentPage] = useState(1)

  const { selectedLeague, setSelectedLeague, setLeagues, setLiveCount, setTotalCount } = useLiveLayout()

  const accent = SPORT_ACCENT[sport]

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
  useEffect(() => { setCurrentPage(1) }, [sport, dateFilter, selectedLeague])

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
    result = filterByDate(result, dateFilter)
    return result
  }, [events, selectedLeague, dateFilter])

  const allGroups  = groupByLeague(filteredEvents)
  const pages      = paginateGroups(allGroups)
  const totalPages = pages.length
  const pageGroups = pages[currentPage - 1] ?? []

  const sportLabel = SPORTS.find(s => s.key === sport)?.label ?? 'Sport'

  return (
    <ErrorBoundary>
      <main className="flex-1 min-w-0 px-6 pb-5 pt-0">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-4"
          style={{ position: 'sticky', top: 200, zIndex: 15, background: 'rgba(8,8,8,0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', marginLeft: -24, marginRight: -24, paddingLeft: 24, paddingRight: 24, paddingTop: 12, paddingBottom: 12 }}
        >
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
            {(['live', 'today', 'tomorrow', 'all'] as DateFilter[]).map(df => (
              <button
                key={df}
                onClick={() => { setDateFilter(df); setCurrentPage(1) }}
                className="px-2.5 py-1 rounded text-[9px] font-mono font-bold tracking-wider transition-all"
                style={dateFilter === df
                  ? { background: `${accent}18`, border: `1px solid ${accent}55`, color: accent }
                  : { background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' }
                }
              >
                {df === 'live' && liveCount > 0
                  ? <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />{liveCount}</span>
                  : DATE_LABELS[df]
                }
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
                    style={{ height: 72, animationDelay: `${i * 50}ms` }} />
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

            {!showSkeleton && filteredEvents.length === 0 && events.length > 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm font-mono text-text-muted">Нет событий для выбранного фильтра</p>
                <button
                  onClick={() => setDateFilter('all')}
                  className="mt-3 text-[10px] font-mono px-3 py-1.5 rounded border transition-all"
                  style={{ borderColor: `${accent}44`, color: accent }}
                >
                  Показать все
                </button>
              </div>
            )}

            {!showSkeleton && filteredEvents.length > 0 && (
              <>
                <div className="flex flex-col gap-0">
                  {pageGroups.map(({ league, events: group }, idx) => {
                    const leagueLiveCount = group.filter(e => e.status === 'live').length
                    return (
                      <div key={league}>
                        <LeagueDivider
                          name={league}
                          count={group.length}
                          liveCount={leagueLiveCount}
                          first={idx === 0}
                        />
                        <div className="flex flex-col gap-1">
                          {group.map(e => (
                            <SportRow
                              key={e.id}
                              event={e}
                              sport={sport}
                              accent={accent}
                              onClick={() => router.push(`/sport/${sport}/${e.id}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <Pagination
                  current={currentPage}
                  total={totalPages}
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
