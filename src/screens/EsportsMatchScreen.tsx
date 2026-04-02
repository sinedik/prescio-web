'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePolling } from '../hooks/usePolling'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import { ErrorBoundary } from '../components/ErrorBoundary'
import type { EsportsMatchDetail, EsportsGame } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMatchTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  if (diff > 0 && diff < 60 * 60_000) return `in ${Math.round(diff / 60000)}m`
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    + ' · ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function parseDuration(iso?: string): string {
  if (!iso || iso === 'PT0S') return ''
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = parseInt(m[1] ?? '0')
  const min = parseInt(m[2] ?? '0')
  const s = parseInt(m[3] ?? '0')
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  if (min > 0 || s > 0) return `${min}:${String(s).padStart(2, '0')}`
  return ''
}

function gameLabel(subcategory: string): string {
  if (subcategory.includes('dota')) return 'DOTA 2'
  if (subcategory.includes('cs') || subcategory.includes('csgo')) return 'CS2'
  if (subcategory.includes('valorant')) return 'VALORANT'
  return 'ESPORTS'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OddsBar({ yesPrice, noPrice, teamA, teamB }: {
  yesPrice: number; noPrice: number; teamA: string; teamB: string
}) {
  const pct = Math.round(yesPrice * 100)
  if (!pct) return null
  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
      <p className="text-[10px] font-mono text-text-muted mb-2 uppercase tracking-wider">Win probability</p>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-mono text-text-primary w-24 truncate">{teamA}</span>
        <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: 'var(--accent)' }}
          />
        </div>
        <span className="text-[11px] font-mono text-text-primary w-24 truncate text-right">{teamB}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[11px] font-mono font-bold" style={{ color: 'var(--accent)' }}>{pct}%</span>
        <span className="text-[11px] font-mono font-bold text-text-muted">{100 - pct}%</span>
      </div>
    </div>
  )
}

function GameCard({ game, teamAName, teamBName, isDota }: {
  game: EsportsGame; teamAName: string; teamBName: string; isDota: boolean
}) {
  const isLive     = game.started && !game.finished
  const isFinished = game.finished
  const wonA = game.teamA?.won
  const wonB = game.teamB?.won
  const scoreA = game.teamA?.score ?? null
  const scoreB = game.teamB?.score ?? null

  return (
    <div
      className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden"
      style={isLive ? { borderLeft: '3px solid var(--accent)' } : undefined}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Map / Game label */}
        <div className="shrink-0 w-20">
          <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
            {isDota ? `Game ${game.seq}` : `Map ${game.seq}`}
          </p>
          {game.map && (
            <p className="text-[12px] font-mono font-bold text-text-primary mt-0.5 truncate">{game.map}</p>
          )}
        </div>

        {/* Score */}
        <div className="flex-1 flex items-center gap-3">
          {/* Team A */}
          <div className={`flex-1 flex items-center gap-2 ${wonA ? '' : isFinished ? 'opacity-50' : ''}`}>
            <span
              className="text-[12px] font-mono font-medium truncate"
              style={{ color: wonA ? 'var(--accent)' : undefined }}
            >
              {teamAName}
            </span>
            {wonA && <span className="text-[10px]" style={{ color: 'var(--accent)' }}>✓</span>}
          </div>

          {/* Score display */}
          <div className="shrink-0 flex items-center gap-2 font-mono">
            {scoreA != null && scoreB != null ? (
              <>
                <span className={`text-lg font-bold ${wonA ? '' : 'text-text-muted'}`}
                  style={{ color: wonA ? 'var(--accent)' : undefined }}>
                  {scoreA}
                </span>
                <span className="text-text-muted/50 text-sm">:</span>
                <span className={`text-lg font-bold ${wonB ? '' : 'text-text-muted'}`}
                  style={{ color: wonB ? 'var(--accent)' : undefined }}>
                  {scoreB}
                </span>
              </>
            ) : isLive ? (
              <span className="text-[10px] font-mono animate-pulse px-2 py-0.5 rounded"
                style={{ background: 'rgba(var(--accent-rgb,0,229,160),0.12)', color: 'var(--accent)' }}>
                LIVE
              </span>
            ) : (
              <span className="text-[10px] font-mono text-text-muted/50">—</span>
            )}
          </div>

          {/* Team B */}
          <div className={`flex-1 flex items-center justify-end gap-2 ${wonB ? '' : isFinished ? 'opacity-50' : ''}`}>
            {wonB && <span className="text-[10px]" style={{ color: 'var(--accent)' }}>✓</span>}
            <span
              className="text-[12px] font-mono font-medium truncate text-right"
              style={{ color: wonB ? 'var(--accent)' : undefined }}
            >
              {teamBName}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <div className="shrink-0 w-12 text-right">
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,61,61,0.15)', color: '#ff3d3d' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
          {isFinished && (
            <span className="text-[9px] font-mono text-text-muted">FIN</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EsportsMatchScreen({ seriesId }: { seriesId: string }) {
  usePageTitle('Match')
  const router = useRouter()

  const fetcher = useCallback(() => api.getEsportsMatch(seriesId), [seriesId])
  const pollInterval = 15_000
  const { data, loading } = usePolling(fetcher, pollInterval)

  const match = data as EsportsMatchDetail | null

  const isLive     = match?.status === 'live'
  const isFinished = match?.status === 'finished'
  const isDota     = (match?.subcategory ?? '').includes('dota')

  const teamAName = match?.teamA?.name ?? '—'
  const teamBName = match?.teamB?.name ?? '—'
  const scoreA    = match?.teamA?.score ?? null
  const scoreB    = match?.teamB?.score ?? null

  const steamMatchId = (match?.steamData?.games as { matchId?: number }[] | undefined)
    ?.find(g => g.matchId)?.matchId

  if (loading && !match) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-6 flex flex-col gap-4">
        <div className="h-6 w-24 rounded animate-pulse bg-bg-surface" />
        <div className="h-32 rounded-lg animate-pulse bg-bg-surface border border-bg-border" />
        <div className="flex flex-col gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="h-16 rounded-lg animate-pulse bg-bg-surface border border-bg-border"
              style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-20 text-center">
        <p className="text-sm font-mono text-text-muted">Match not found</p>
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="w-full max-w-3xl mx-auto px-6 py-6 flex flex-col gap-4">

      {/* Back + badges row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-bg-border text-text-muted">
            {gameLabel(match.subcategory)}
          </span>
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,61,61,0.15)', color: '#ff3d3d', border: '1px solid rgba(255,61,61,0.25)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
          {isFinished && (
            <span className="text-[9px] font-mono text-text-muted border border-bg-border px-2 py-0.5 rounded">
              FINISHED
            </span>
          )}
        </div>
      </div>

      {/* Match header */}
      <div className="bg-bg-surface border border-bg-border rounded-lg p-5"
        style={isLive ? { borderTop: '3px solid var(--accent)' } : undefined}>

        {/* Teams + score */}
        <div className="flex items-center justify-between gap-4">
          {/* Team A */}
          <div className="flex-1 text-left">
            <p className="text-lg font-mono font-bold text-text-primary leading-tight">{teamAName}</p>
            {isFinished && scoreA !== null && scoreA > (scoreB ?? 0) && (
              <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--accent)' }}>WINNER</p>
            )}
          </div>

          {/* Score */}
          <div className="shrink-0 text-center">
            {(isLive || isFinished) && scoreA != null && scoreB != null ? (
              <div className="flex items-center gap-3">
                <span className="text-3xl font-mono font-bold text-text-primary">{scoreA}</span>
                <span className="text-text-muted text-xl">:</span>
                <span className="text-3xl font-mono font-bold text-text-primary">{scoreB}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-mono text-text-muted">vs</span>
              </div>
            )}
            {match.format && (
              <p className="text-[9px] font-mono text-text-muted/60 mt-1 text-center">{match.format}</p>
            )}
          </div>

          {/* Team B */}
          <div className="flex-1 text-right">
            <p className="text-lg font-mono font-bold text-text-primary leading-tight">{teamBName}</p>
            {isFinished && scoreB !== null && scoreB > (scoreA ?? 0) && (
              <p className="text-[10px] font-mono mt-0.5 text-right" style={{ color: 'var(--accent)' }}>WINNER</p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-3 pt-3 border-t border-bg-border/50 flex flex-wrap items-center gap-x-3 gap-y-1">
          {match.tournament && (
            <span className="text-[10px] font-mono text-text-muted">{match.tournament}</span>
          )}
          {match.startsAt && !isLive && !isFinished && (
            <span className="text-[10px] font-mono text-text-muted">
              {formatMatchTime(match.startsAt)}
            </span>
          )}
          {isLive && match.liveState?.updatedAt && (
            <span className="text-[10px] font-mono text-text-muted/60">
              Updated {new Date(match.liveState.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Steam Live block for Dota2 */}
      {isDota && steamMatchId && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors hover:opacity-90"
          style={{ background: 'rgba(255,200,0,0.05)', border: '1px solid rgba(255,200,0,0.2)' }}
          onClick={() => router.push(`/cybersport/dota/${steamMatchId}`)}
        >
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,200,0,0.12)', color: '#f5c842', border: '1px solid rgba(255,200,0,0.2)' }}>
              STEAM LIVE
            </span>
            <span className="text-[11px] font-mono text-text-muted">
              Live minimap, heroes, items · ~2 min DotaTV delay
            </span>
          </div>
          <span className="text-[11px] font-mono text-accent shrink-0">View →</span>
        </div>
      )}

      {/* Games / Maps */}
      {match.games.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            {isDota ? 'Games' : 'Maps'}
          </p>
          {match.games.map(g => (
            <GameCard
              key={g.seq}
              game={g}
              teamAName={teamAName}
              teamBName={teamBName}
              isDota={isDota}
            />
          ))}
        </div>
      )}

      {match.games.length === 0 && !isLive && !isFinished && (
        <div className="bg-bg-surface border border-bg-border rounded-lg px-4 py-6 text-center">
          <p className="text-[11px] font-mono text-text-muted">No maps data yet</p>
          <p className="text-[10px] font-mono text-text-muted/60 mt-0.5">
            Live data will appear once the match starts
          </p>
        </div>
      )}

      {/* Odds */}
      {match.yesPrice != null && (
        <OddsBar
          yesPrice={match.yesPrice}
          noPrice={match.noPrice}
          teamA={teamAName}
          teamB={teamBName}
        />
      )}

    </div>
    </ErrorBoundary>
  )
}
