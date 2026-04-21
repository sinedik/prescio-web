'use client'
import { useState, useMemo, useEffect } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePolling } from '../hooks/usePolling'
import { api } from '../lib/api'
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
import EsportsMatchCard from '../components/esports/EsportsMatchCard'

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
            <EsportsMatchCard key={m.id} match={m} href={makeHref(m)} />
          ))}
        </div>
      )}
    </div>
  )
}

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

  const { selectedLeague: activeTournament, setSelectedLeague: setActiveTournament, setLeagues, setLiveCount, setTotalCount, setTodayCount } = useLiveLayout()

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
  useEffect(() => { setTodayCount(0) }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
                          {ms.map(m => (
                            <EsportsMatchCard key={m.id} match={m} href={`/cybersport/${game}/${m.id}`} />
                          ))}
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
