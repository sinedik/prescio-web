'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { usePageTitle } from '../hooks/usePageTitle'
import { api, sportApi } from '../lib/api'
import DotaLiveCard from '../components/dota/DotaLiveCard'
import DotaMatchCard from '../components/dota/DotaMatchCard'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import type { DotaSeries, DotaProMatch } from '../types/dota'
import type { SportEvent } from '../types/index'

type Tab = 'live' | 'recent' | 'cs2'

export default function DotaScreen() {
  usePageTitle('Esports')
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  const [tab, setTab] = useState<Tab>('live')

  // Live series — poll every 30s
  const fetchLive = useCallback(() => api.getDotaLive(), [])
  const { data: liveData, loading: liveLoading } = usePolling(fetchLive, 30_000)
  const series: DotaSeries[] = (liveData as { series?: DotaSeries[] })?.series ?? []

  // Recent matches — poll every 2min
  const fetchRecent = useCallback(() => api.getDotaMatches(30), [])
  const { data: recentData, loading: recentLoading } = usePolling(fetchRecent, 120_000)
  const matches: DotaProMatch[] = (recentData as { matches?: DotaProMatch[] })?.matches ?? []

  // CS2 matches from sport_events — poll every 2min
  const fetchCS2 = useCallback(
    () => sportApi.getEvents({ subcategory: 'cs2', limit: 30 }),
    []
  )
  const { data: cs2Data, loading: cs2Loading } = usePolling(fetchCS2, 120_000)
  const cs2Matches: SportEvent[] = (cs2Data as { events?: SportEvent[] })?.events ?? []

  const liveDotaCount = tab === 'live' ? series.length : 0

  return (
    <ErrorBoundary>
    <div className="w-full max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">{tr('dota.title').toUpperCase()}</h1>
          <p className="text-[10px] font-mono text-text-muted mt-0.5">Dota 2 · CS2 · Pro matches · Steam + PandaScore</p>
        </div>
        <div className="flex items-center gap-2">
          {liveDotaCount > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold"
              style={{ background: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.25)', color: '#ff3d3d' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {liveDotaCount} LIVE
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit mb-6">
        {([
          { key: 'live' as Tab, label: tr('dota.live_matches').toUpperCase() },
          { key: 'recent' as Tab, label: tr('dota.recent_matches').toUpperCase() },
          { key: 'cs2' as Tab, label: 'CS2' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-[11px] font-mono font-bold rounded transition-colors ${
              tab === key ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── LIVE TAB ── */}
      {tab === 'live' && (
        <>
          {liveLoading && (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-xl animate-pulse bg-bg-surface border border-bg-border" style={{ height: '140px', animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          )}

          {!liveLoading && series.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-bg-surface border border-bg-border">
                <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              </div>
              <p className="text-sm font-mono text-text-muted mb-1">{tr('dota.no_live')}</p>
              <p className="text-xs font-mono text-text-muted opacity-60">Check back during a tournament</p>
            </div>
          )}

          {!liveLoading && series.length > 0 && (
            <div className="flex flex-col gap-3">
              {series.map(s => (
                <DotaLiveCard
                  key={s.seriesId}
                  series={s}
                  onClick={() => {
                    const liveGame = s.games.find(g => g.isLive)
                    const target = liveGame ?? [...s.games].sort((a, b) => b.gameNumber - a.gameNumber)[0]
                    if (target) {
                      const params = liveGame?.serverSteamId
                        ? `?server_steam_id=${liveGame.serverSteamId}`
                        : ''
                      router.push(`/dota/${target.matchId}${params}`)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── RECENT TAB ── */}
      {tab === 'recent' && (
        <>
          {recentLoading && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 4, 5].map(i => (
                <div key={i} className="rounded-lg animate-pulse bg-bg-surface border border-bg-border" style={{ height: '56px', animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          )}

          {!recentLoading && matches.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm font-mono text-text-muted">No recent matches found</p>
            </div>
          )}

          {!recentLoading && matches.length > 0 && (
            <div className="flex flex-col gap-2">
              {matches.map(m => (
                <DotaMatchCard
                  key={m.matchId}
                  match={m}
                  onClick={() => router.push(`/dota/${m.matchId}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── CS2 TAB ── */}
      {tab === 'cs2' && (
        <>
          {cs2Loading && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-lg animate-pulse bg-bg-surface border border-bg-border" style={{ height: '56px', animationDelay: `${i * 60}ms` }} />
              ))}
            </div>
          )}

          {!cs2Loading && cs2Matches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-bg-surface border border-bg-border">
                <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                </svg>
              </div>
              <p className="text-sm font-mono text-text-muted mb-1">No CS2 matches found</p>
              <p className="text-xs font-mono text-text-muted opacity-60">Check back during an active tournament</p>
            </div>
          )}

          {!cs2Loading && cs2Matches.length > 0 && (
            <div className="flex flex-col gap-2">
              {cs2Matches.map(m => {
                const isLive = m.status === 'live'
                const isFinished = m.status === 'finished'
                const matchDate = new Date(m.starts_at)
                const dateStr = matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                const timeStr = matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div
                    key={m.id}
                    className="bg-bg-surface border border-bg-border rounded-lg px-4 py-3 flex items-center gap-3"
                    style={{ borderLeft: isLive ? '3px solid var(--accent)' : undefined }}
                  >
                    {/* Status badge */}
                    <div className="shrink-0 w-14 text-center">
                      {isLive ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                          style={{ background: 'rgba(255,61,61,0.15)', color: '#ff3d3d' }}>
                          LIVE
                        </span>
                      ) : isFinished ? (
                        <span className="text-[9px] font-mono text-text-muted">FIN</span>
                      ) : (
                        <div className="text-center">
                          <p className="text-[9px] font-mono text-text-muted">{dateStr}</p>
                          <p className="text-[9px] font-mono text-text-muted">{timeStr}</p>
                        </div>
                      )}
                    </div>

                    {/* Teams */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-mono text-text-primary truncate">{m.home_team}</span>
                        <span className="text-[10px] font-mono text-text-muted shrink-0">vs</span>
                        <span className="text-[13px] font-mono text-text-primary truncate">{m.away_team}</span>
                      </div>
                      {m.league && (
                        <p className="text-[10px] font-mono text-text-muted mt-0.5 truncate">{m.league}</p>
                      )}
                    </div>

                    {/* Score (if finished/live) */}
                    {(isLive || isFinished) && m.home_score != null && m.away_score != null && (
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-mono font-bold text-text-primary">
                          {m.home_score} : {m.away_score}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
    </ErrorBoundary>
  )
}
