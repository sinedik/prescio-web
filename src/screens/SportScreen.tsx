'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { getCached, setCached } from '../lib/clientCache'
import { flushSync } from 'react-dom'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSportWs } from '../hooks/useSportWs'
import { sportApi } from '../lib/api'
import { syncSportDateAction } from '../actions/sport'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { SportEvent, SubscriptionPlan } from '../types/index'
import { useAuthContext } from '../contexts/AuthContext'
import type { EventMeta, EventFastCache } from './SportEventPage'
import type { SidebarLeague } from '../contexts/LiveLayoutContext'

const SportEventPage = dynamic(() => import('./SportEventPage'), {
  loading: () => (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-32 rounded-lg bg-bg-surface border border-bg-border" />
      <div className="h-64 rounded-lg bg-bg-surface border border-bg-border" />
    </div>
  ),
})

import { EmptyHint } from '../components/EmptyHint'
import { useLiveLayout } from '../contexts/LiveLayoutContext'
import { useLang } from '../contexts/LanguageContext'
import { t as tFn, useT } from '../lib/i18n'
import SportMatchCard from '../components/sport/SportMatchCard'
import type { Lang } from '../lib/i18n'
import PrescioLoader from '../components/PrescioLoader'
import { Pagination } from '../components/live/Pagination'
import { GroupDivider } from '../components/live/GroupDivider'
import { ActiveFilterBanner } from '../components/live/ActiveFilterBanner'
import { scrollLiveContentToTop } from '../components/live/scrollLiveContent'
import { useLoaderMinHold } from '../components/live/useLoaderMinHold'

// ─── Types ────────────────────────────────────────────────────────────────────
export type Sport = 'football' | 'basketball' | 'tennis' | 'mma'

// 'live' | 'YYYY-MM-DD'
type SelectedDate = 'live' | string

const SPORT_ACCENT: Record<Sport, string> = {
  football:   'var(--sport-football)',
  basketball: 'var(--sport-basketball)',
  tennis:     'var(--sport-tennis)',
  mma:        'var(--sport-mma)',
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function eventLocalDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Returns today + N days ahead as 'YYYY-MM-DD' strings */
function buildDateRange(days = 7): string[] {
  const result: string[] = []
  const base = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    result.push(toLocalDateStr(d))
  }
  return result
}

function formatDateLabel(dateStr: string, lang: Lang): { weekday: string; day: string; month: string } {
  const d = new Date(dateStr + 'T12:00:00')
  const today = toLocalDateStr(new Date())
  const tomorrow = toLocalDateStr(new Date(Date.now() + 86_400_000))
  const locale = lang === 'ru' ? 'ru-RU' : 'en-US'
  if (dateStr === today)    return { weekday: tFn('sport.today', lang), day: '', month: '' }
  if (dateStr === tomorrow) return { weekday: tFn('sport.tomorrow', lang), day: '', month: '' }
  return {
    weekday: d.toLocaleDateString(locale, { weekday: 'short' }),
    day:     String(d.getDate()),
    month:   d.toLocaleDateString(locale, { month: 'short' }),
  }
}

// ─── Pagination ───────────────────────────────────────────────────────────────
const EVENTS_PER_PAGE = 30
type LeagueGroup = { league: string; logo?: string | null; flag?: string | null; events: SportEvent[] }

function paginateGroups(groups: LeagueGroup[]): LeagueGroup[][] {
  const pages: LeagueGroup[][] = []
  let page: LeagueGroup[] = [], count = 0
  for (const g of groups) {
    if (count + g.events.length > EVENTS_PER_PAGE && page.length > 0) {
      pages.push(page); page = [g]; count = g.events.length
    } else {
      page.push(g); count += g.events.length
    }
  }
  if (page.length > 0) pages.push(page)
  return pages
}

// ─── Date strip ───────────────────────────────────────────────────────────────
function DateStrip({ dates, selected, onSelect, countByDate, liveCount, accent, syncingDate, lang }: {
  dates: string[]
  selected: SelectedDate
  onSelect: (d: SelectedDate) => void
  countByDate: Map<string, number>
  liveCount: number
  accent: string
  syncingDate?: string | null
  lang: Lang
}) {
  return (
    <div className="relative -mx-3 sm:-mx-4 md:-mx-6">
      <div className="flex overflow-x-auto gap-1.5 px-3 sm:px-4 md:px-6 pb-2 pt-1 scrollbar-none"
        style={{ scrollbarWidth: 'none' }}>

        {/* Live tab */}
        <button
          onClick={() => onSelect('live')}
          className="flex flex-col items-center px-3 py-2 rounded-lg border shrink-0 transition-all min-w-[52px]"
          style={selected === 'live'
            ? { borderColor: 'rgba(255,50,50,0.5)', background: 'rgba(255,50,50,0.1)', color: '#ff5252' }
            : { borderColor: 'rgba(var(--surface-tint-rgb), 0.07)', background: 'rgba(var(--surface-tint-rgb), 0.03)', color: liveCount > 0 ? '#ff5252' : 'rgb(var(--text-muted))' }
          }
        >
          <div className="flex items-center gap-1">
            {liveCount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />}
            <span className="text-[11px] font-mono font-bold">Live</span>
          </div>
          <span className="text-[10px] font-mono mt-0.5" style={{ color: selected === 'live' ? '#ff5252' : liveCount > 0 ? 'rgba(255,82,82,0.6)' : 'rgba(var(--text-muted),0.5)' }}>
            {liveCount > 0 ? liveCount : '—'}
          </span>
        </button>

        {/* Date tabs */}
        {dates.map(dateStr => {
          const { weekday, day, month } = formatDateLabel(dateStr, lang)
          const count = countByDate.get(dateStr) ?? 0
          const isSelected = selected === dateStr
          const AMBER = '#D4A017'
          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
              className="flex flex-col items-center px-3 py-2 rounded-lg border shrink-0 transition-all min-w-[52px]"
              style={isSelected
                ? { borderColor: 'rgba(212,160,23,0.4)', background: 'rgba(212,160,23,0.08)', color: AMBER }
                : { borderColor: 'rgba(var(--surface-tint-rgb), 0.1)', background: 'transparent', color: count > 0 ? 'rgba(var(--surface-tint-rgb),0.5)' : 'rgba(var(--surface-tint-rgb),0.22)' }
              }
            >
              <span className="text-[11px] font-mono font-medium capitalize leading-tight">
                {weekday}
              </span>
              {day && (
                <span className="text-[9px] font-mono mt-0.5 leading-none opacity-70">
                  {day} {month}
                </span>
              )}
              <span className="text-[10px] font-mono mt-0.5"
                style={{ color: isSelected ? AMBER : count > 0 ? 'rgba(var(--surface-tint-rgb),0.4)' : 'rgba(var(--surface-tint-rgb),0.18)' }}>
                {syncingDate === dateStr
                  ? <svg className="w-2.5 h-2.5 animate-spin inline" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  : count > 0 ? count : '—'
                }
              </span>
            </button>
          )
        })}
      </div>
      {/* right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-10"
        style={{ background: 'linear-gradient(to right, transparent, rgba(var(--bg-base-rgb), 0.9))' }} />
    </div>
  )
}

// ─── League grouping ──────────────────────────────────────────────────────────
function sortEventsInGroup(events: SportEvent[]): SportEvent[] {
  const live     = events.filter(e => e.status === 'live')
    .sort((a, b) => {
      const ea = (a.raw_data as Record<string, unknown> | null)?.elapsed as number ?? 0
      const eb = (b.raw_data as Record<string, unknown> | null)?.elapsed as number ?? 0
      return eb - ea
    })
  const upcoming = events.filter(e => e.status !== 'live' && e.status !== 'finished')
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  const finished = events.filter(e => e.status === 'finished')
    .sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
  return [...live, ...upcoming, ...finished]
}

function groupByLeague(events: SportEvent[]): LeagueGroup[] {
  const map = new Map<string, { events: SportEvent[]; logo?: string | null; flag?: string | null }>()
  for (const e of events) {
    const key = e.league || e.subcategory || 'Unknown'
    if (!map.has(key)) {
      const raw = e.raw_data as Record<string, unknown> | null
      map.set(key, {
        events: [],
        logo:   raw?.league_logo as string | null | undefined,
        flag:   raw?.league_flag as string | null | undefined,
      })
    }
    map.get(key)!.events.push(e)
  }
  return Array.from(map.entries())
    .map(([league, { events, logo, flag }]) => ({ league, logo, flag, events: sortEventsInGroup(events) }))
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

// ─── Main screen ──────────────────────────────────────────────────────────────
export function SportScreen({ initialSport, eventId, initialEvents, initialEventFull }: { initialSport?: Sport; eventId?: string; initialEvents?: SportEvent[]; initialEventFull?: unknown } = {}) {
  usePageTitle('Sport')
  const router = useRouter()
  const { profile } = useAuthContext()
  const { lang } = useLang()
  const t = useT(lang)
  const _plan = (profile?.plan ?? (profile?.is_pro ? 'pro' : 'free')) as SubscriptionPlan

  const sport  = initialSport ?? 'football'
  const accent = SPORT_ACCENT[sport]

  // Date strip: 30 days from today
  const dateRange = useMemo(() => buildDateRange(30), [])
  const today     = useMemo(() => toLocalDateStr(new Date()), [])

  const [selectedDate, setSelectedDate] = useState<SelectedDate>(() => getCached<SelectedDate>(`sport_date:${sport}`) ?? today)
  const [currentPage, setCurrentPage]   = useState(1)
  const [matchLeague, setMatchLeague]     = useState('')
  const [matchLeagueId, setMatchLeagueId] = useState<number | null>(null)
  const [matchHome, setMatchHome]         = useState('')
  const [matchAway, setMatchAway]         = useState('')
  const [syncingDate, setSyncingDate]   = useState<string | null>(null)
  const [syncVersion, setSyncVersion]   = useState(0)

  const { selectedLeague, setSelectedLeague, setLeagues, setLiveCount, setTotalCount, setTodayCount } = useLiveLayout()

  // Fetch 30-day window from server (today → +30 days), plus live events
  const fetchParams = useMemo(() => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    const to = new Date(from)
    to.setDate(to.getDate() + 30)
    to.setHours(23, 59, 59, 999)
    return {
      subcategory:   sport,
      limit:         100,
      starts_after:  from.toISOString(),
      starts_before: to.toISOString(),
    }
  }, [sport])

  const [events, setEvents]       = useState<SportEvent[]>(() => {
    const cached = getCached<SportEvent[]>(`sport_events:${sport}`)
    if (cached) return cached
    if (initialEvents && initialEvents.length) {
      setCached(`sport_events:${sport}`, initialEvents)
      return initialEvents
    }
    return []
  })
  const [loading, setLoading]     = useState(() => !getCached<SportEvent[]>(`sport_events:${sport}`) && !(initialEvents && initialEvents.length))
  const [isRefreshing] = useState(false)

  // Initial fetch + refetch on sport/syncVersion change
  useEffect(() => {
    const key = `sport_events:${sport}`
    const cached = getCached<SportEvent[]>(key)
    // Don't clear SSR-provided events — only show skeleton when we have nothing at all
    if (!cached && !(initialEvents && initialEvents.length)) { setEvents([]); setLoading(true) }

    sportApi.getEvents(fetchParams)
      .then(res => {
        const evts = res.events ?? []
        setEvents(evts)
        setCached(key, evts)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [sport, syncVersion]) // eslint-disable-line react-hooks/exhaustive-deps

  // WS: patch score/status in-place without re-fetching the full list
  useSportWs({
    subscribeList: true,
    onListUpdate: useCallback((data: { id: string; status: string; home_score: number | null; away_score: number | null; elapsed: number | null; status_short: string | null }) => {
      setEvents(prev => prev.map(e =>
        e.id === data.id
          ? { ...e, status: data.status as SportEvent['status'], home_score: data.home_score ?? undefined, away_score: data.away_score ?? undefined, raw_data: { ...(e.raw_data as Record<string, unknown> | null ?? {}), elapsed: data.elapsed, status_short: data.status_short } }
          : e
      ))
    }, []),
  })

  useEffect(() => { setCurrentPage(1) }, [sport, selectedDate, selectedLeague])
  useEffect(() => { setSelectedDate(getCached<SelectedDate>(`sport_date:${sport}`) ?? today) }, [sport, today])

  const showSkeleton = useLoaderMinHold(loading)
  void isRefreshing // kept for future use

  const liveCount = events.filter(e => e.status === 'live').length

  // Count events per date — league-aware for DateStrip display
  const countByDate = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>()
    const source = selectedLeague
      ? events.filter(e => (e.league || e.subcategory || '') === selectedLeague)
      : events
    for (const e of source) {
      if (e.status === 'live') continue // live counted separately
      const d = eventLocalDate(e.starts_at)
      map.set(d, (map.get(d) ?? 0) + 1)
    }
    return map
  }, [events, selectedLeague])

  // Unfiltered counts for sync decision (don't sync when data exists globally)
  const countByDateAll = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>()
    for (const e of events) {
      if (e.status === 'live') continue
      const d = eventLocalDate(e.starts_at)
      map.set(d, (map.get(d) ?? 0) + 1)
    }
    return map
  }, [events])

  const leagues = useMemo<SidebarLeague[]>(() => {
    const seen = new Map<string, { flag: string | null; leagueId: number | null }>()
    for (const e of events) {
      const name = e.league || e.subcategory || ''
      if (!name || seen.has(name)) continue
      const raw = e.raw_data as Record<string, unknown> | null
      seen.set(name, {
        flag: (raw?.league_flag as string | null | undefined) ?? null,
        leagueId: (raw?.league_id as number | null | undefined) ?? null,
      })
    }
    return Array.from(seen.entries())
      .map(([name, { flag, leagueId }]) => ({ name, flag, leagueId }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [events])
  const todayCount = useMemo(() => {
    const today = toLocalDateStr(new Date())
    return events.filter(e => eventLocalDate(e.starts_at) === today).length
  }, [events])
  useEffect(() => {
    setLeagues(leagues)
    setLiveCount(liveCount)
    setTotalCount(events.length)
    setTodayCount(todayCount)
  }, [leagues, liveCount, events.length, todayCount]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEvents = useMemo(() => {
    let result = selectedLeague
      ? events.filter(e => (e.league || e.subcategory || '') === selectedLeague)
      : events
    if (selectedDate === 'live') {
      result = result.filter(e => e.status === 'live')
    } else {
      result = result.filter(e => eventLocalDate(e.starts_at) === selectedDate)
    }
    return result
  }, [events, selectedLeague, selectedDate])

  const allGroups  = useMemo(() => groupByLeague(filteredEvents), [filteredEvents])
  const pages      = useMemo(() => paginateGroups(allGroups), [allGroups])
  const totalPages = pages.length
  const pageGroups = pages[currentPage - 1] ?? []

  const eventsBefore = pages.slice(0, currentPage - 1).reduce((sum, pg) => sum + pg.reduce((s, g) => s + g.events.length, 0), 0)
  const eventsOnPage = pageGroups.reduce((sum, g) => sum + g.events.length, 0)
  const pageStart    = filteredEvents.length > 0 ? eventsBefore + 1 : 0
  const pageEnd      = eventsBefore + eventsOnPage

  const handleDateSelect = useCallback(async (d: SelectedDate) => {
    setSelectedDate(d)
    setCached(`sport_date:${sport}`, d)
    setCurrentPage(1)
    if (d === 'live' || d === today) return
    // Sync only when no data at all for this date (regardless of league filter)
    if ((countByDateAll.get(d) ?? 0) === 0) {
      setSyncingDate(d)
      try {
        await syncSportDateAction(sport, d)
        setSyncVersion(v => v + 1)
      } catch { /* ignore */ } finally {
        setSyncingDate(null)
      }
    }
  }, [countByDateAll, sport, today])

  // Reset selected date when league changes — if current date has no data for new league
  useEffect(() => {
    if (selectedDate === 'live' || selectedDate === today) return
    if ((countByDate.get(selectedDate) ?? 0) === 0) {
      setSelectedDate(today)
      setCurrentPage(1)
    }
  }, [selectedLeague]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ErrorBoundary>
      <main className="flex-1 min-w-0 px-3 sm:px-4 md:px-6 pb-5 pt-0">

        {/* Page header — breadcrumbs only when viewing a match */}
        {eventId && (
          <div className="flex items-center gap-0 mb-3 pt-3 pb-2 sport-sticky-header"
            style={{ position: 'sticky', zIndex: 15, background: 'rgba(var(--bg-base-rgb), 0.75)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          >
            <div className="flex items-center gap-0 min-w-0">
              <button
                onClick={() => window.history.length > 1 ? router.back() : router.push(`/sport/${sport}`)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors shrink-0 pr-2"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
                {t('sport.back')}
              </button>
              {matchLeague && (
                <>
                  <span className="text-text-muted/45 text-[11px] mx-1.5">/</span>
                  {matchLeagueId
                    ? <button onClick={() => router.push(`/sport/${sport}/league/${matchLeagueId}`)} className="text-[11px] font-medium text-text-muted hover:text-text-primary transition-colors truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{matchLeague}</button>
                    : <span className="text-[11px] font-medium text-text-muted truncate max-w-[80px] sm:max-w-[120px] md:max-w-[140px]">{matchLeague}</span>
                  }
                </>
              )}
              {(matchHome || matchAway) && (
                <>
                  <span className="text-text-muted/45 text-[11px] mx-1.5">/</span>
                  <span className="text-[11px] font-medium text-text-primary truncate max-w-[140px] sm:max-w-[200px] md:max-w-[260px]">{matchHome} — {matchAway}</span>
                </>
              )}
            </div>
            {isRefreshing && (
              <svg className="w-3 h-3 animate-spin text-text-muted/40 shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 11-6.219-8.56"/>
              </svg>
            )}
          </div>
        )}

        {/* Date strip — hidden inside match */}
        {!showSkeleton && !eventId && (
          <div className="mb-3">
            <DateStrip
              dates={dateRange}
              selected={selectedDate}
              onSelect={handleDateSelect}
              countByDate={countByDate}
              liveCount={liveCount}
              accent={accent}
              syncingDate={syncingDate}
              lang={lang}
            />
          </div>
        )}

        {/* Content */}
        {eventId ? (
          <SportEventPage id={eventId} initialFast={initialEventFull as EventFastCache | undefined} onBack={() => window.history.length > 1 ? router.back() : router.push(`/sport/${sport}`)} onLeagueLoad={(meta: EventMeta) => { setMatchLeague(meta.league); setMatchLeagueId(meta.leagueId ?? null); setMatchHome(meta.homeTeam); setMatchAway(meta.awayTeam) }} />
        ) : (
          <>
            {selectedLeague && !showSkeleton && (
              <ActiveFilterBanner
                label={t('sport.league_filter')}
                value={selectedLeague}
                onClear={() => setSelectedLeague(null)}
              />
            )}

            {showSkeleton && (
              <PrescioLoader color={accent} state="loading" label={t('sport.loading_matches')} />
            )}

            {!showSkeleton && events.length === 0 && (
              <PrescioLoader
                color={accent}
                state="idle"
                label={t('sport.no_events')}
                sublabel={t('sport.data_syncing')}
              />
            )}

            {!showSkeleton && filteredEvents.length === 0 && events.length > 0 && (
              <EmptyHint
                icon="calendar"
                label={t('sport.no_matches_date')}
                action={{ label: t('sport.back_to_today'), onClick: () => setSelectedDate(today) }}
              />
            )}

            {!showSkeleton && filteredEvents.length > 0 && (
              <>
                <div className="flex flex-col gap-0">
                  {pageGroups.map(({ league, logo, flag, events: group }, idx) => {
                    const leagueLiveCount = group.filter(e => e.status === 'live').length
                    return (
                      <div key={league}>
                        <GroupDivider
                          name={league}
                          logo={logo}
                          flag={flag}
                          count={group.length}
                          liveCount={leagueLiveCount}
                          first={idx === 0}
                        />
                        <div className="flex flex-col gap-2 pt-2">
                          {group.map(e => (
                            <SportMatchCard
                              key={e.id}
                              event={e}
                              href={`/sport/${sport}/${e.id}`}
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
                  totalEvents={filteredEvents.length}
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
