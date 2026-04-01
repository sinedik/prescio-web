'use client'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import DotaLiveCard from '../components/dota/DotaLiveCard'
import DotaMatchCard from '../components/dota/DotaMatchCard'
import type { DotaSeries, DotaProMatch } from '../types/dota'

type Tab = 'live' | 'recent'

export default function DotaScreen() {
  usePageTitle('Dota 2')
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('live')

  // Live series — poll every 30s
  const fetchLive = useCallback(() => api.getDotaLive(), [])
  const { data: liveData, loading: liveLoading } = usePolling(fetchLive, 30_000)
  const series: DotaSeries[] = (liveData as { series?: DotaSeries[] })?.series ?? []

  // Recent matches — poll every 2min
  const fetchRecent = useCallback(() => api.getDotaMatches(30), [])
  const { data: recentData, loading: recentLoading } = usePolling(fetchRecent, 120_000)
  const matches: DotaProMatch[] = (recentData as { matches?: DotaProMatch[] })?.matches ?? []

  return (
    <div className="w-full max-w-5xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">DOTA 2</h1>
          <p className="text-[10px] font-mono text-text-muted mt-0.5">Pro matches · Live · Steam + OpenDota</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'live' && series.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono font-bold"
              style={{ background: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.25)', color: '#ff3d3d' }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {series.length} LIVE
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit mb-6">
        {([
          { key: 'live', label: 'LIVE' },
          { key: 'recent', label: 'RECENT' },
        ] as { key: Tab; label: string }[]).map(({ key, label }) => (
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
              <p className="text-sm font-mono text-text-muted mb-1">No live matches right now</p>
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
    </div>
  )
}
