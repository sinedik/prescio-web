'use client'
import { useState, useMemo, useEffect, memo } from 'react'
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
  const matches = data ?? []

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
                    return (
                      <div key={tournament}>
                        <GroupDivider name={tournament} count={ms.length} liveCount={tournLive} first={idx === 0} />
                        <div className="flex flex-col gap-1">
                          {ms.map(m => (
                            <EsportsRow
                              key={m.id}
                              match={m}
                              accent={accent}
                              href={`/cybersport/${game}/${m.id}`}
                              lang={lang}
                              tomorrowLabel={tomorrowLabel}
                            />
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
