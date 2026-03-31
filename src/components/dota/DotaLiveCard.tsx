'use client'
import { useState } from 'react'
import type { DotaSeries, DotaLiveGame } from '../../types/dota'

function formatTime(secs: number): string {
  const m = Math.floor(Math.abs(secs) / 60)
  const s = Math.abs(secs) % 60
  return `${secs < 0 ? '-' : ''}${m}:${String(s).padStart(2, '0')}`
}

function TeamLogo({ teamId, name, logo, size = 36 }: { teamId: number | null; name: string; logo: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const steamUrl = teamId ? `https://cdn.cloudflare.steamstatic.com/apps/dota2/teamlogos/${teamId}.png` : null
  const src = logo || steamUrl

  const initials = name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  if (!src || failed) {
    return (
      <div
        className="rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-[11px] bg-bg-elevated border border-bg-border text-text-muted"
        style={{ width: size, height: size }}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className="rounded-lg overflow-hidden shrink-0 bg-bg-elevated" style={{ width: size, height: size }}>
      <img src={src} alt={name} className="w-full h-full object-contain" onError={() => setFailed(true)} draggable={false} />
    </div>
  )
}

function LiveDot() {
  return <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
}

function GamePill({ game, teamAId, isFirstLive }: { game: DotaLiveGame; teamAId: number | null; isFirstLive: boolean }) {
  if (game.isLive) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-mono font-bold"
        style={{ background: 'rgba(255,61,61,0.12)', border: '1px solid rgba(255,61,61,0.25)', color: '#ff3d3d' }}>
        <LiveDot />
        G{game.gameNumber}
        <span className="opacity-80">· {formatTime(game.gameTime ?? 0)}</span>
      </div>
    )
  }

  const fin = game.finished
  if (!fin) {
    return (
      <div className="px-2 py-1 rounded text-[9px] font-mono font-bold bg-bg-elevated text-text-muted">
        G{game.gameNumber}
      </div>
    )
  }

  const radiantWon = fin.radiantWin
  const aWon = radiantWon
  const color = aWon ? '#00e5a0' : '#ff4f6a'

  return (
    <div className="px-2 py-1 rounded text-[9px] font-mono font-bold"
      style={{ background: aWon ? 'rgba(0,229,160,0.08)' : 'rgba(255,79,106,0.08)', color }}>
      G{game.gameNumber} · {aWon ? 'W' : 'L'} {fin.radiantScore}:{fin.direScore}
    </div>
  )
}

interface Props {
  series: DotaSeries
  onClick?: () => void
}

export default function DotaLiveCard({ series, onClick }: Props) {
  const { teamRadiant, teamDire, leagueName, games, spectators, seriesType } = series
  const sortedGames = [...games].sort((a, b) => a.gameNumber - b.gameNumber)
  const liveGame = sortedGames.find(g => g.isLive) ?? null
  const betweenGames = !liveGame && sortedGames.length > 0

  let aWins = 0, bWins = 0
  for (const g of sortedGames.filter(g => !g.isLive)) {
    if (g.finished?.radiantWin === true) aWins++
    else if (g.finished?.radiantWin === false) bWins++
  }

  const boLabel = seriesType === 0 ? 'Bo1' : seriesType === 2 ? 'Bo5' : 'Bo3'
  const gold = liveGame?.goldAdvantage ?? 0
  const goldAbs = Math.abs(gold)
  const radiantAhead = gold >= 0
  const goldLabel = goldAbs >= 1000 ? `${(goldAbs / 1000).toFixed(1)}k` : String(goldAbs)
  const goldPct = Math.min(goldAbs / 20000, 1)

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer transition-all duration-150 hover:opacity-90 bg-bg-surface border border-bg-border"
      style={{ borderColor: 'rgba(255,61,61,0.2)' }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-bg-elevated border-b border-bg-border">
        <span className="text-[10px] font-mono font-bold truncate text-text-muted">
          {leagueName}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-mono font-bold"
            style={{ background: 'rgba(255,61,61,0.12)', border: '1px solid rgba(255,61,61,0.3)', color: '#ff3d3d' }}>
            <LiveDot />
            LIVE
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold bg-bg-surface text-text-muted border border-bg-border">
            {boLabel}
          </span>
          {spectators > 0 && (
            <span className="text-[9px] font-mono text-text-muted">
              {spectators >= 1000 ? `${(spectators / 1000).toFixed(1)}k` : spectators} watching
            </span>
          )}
        </div>
      </div>

      {/* Game pills */}
      {sortedGames.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-0 flex-wrap">
          {sortedGames.map(g => (
            <GamePill key={g.matchId} game={g} teamAId={teamRadiant.id} isFirstLive={g.isLive} />
          ))}
        </div>
      )}

      {/* Score */}
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Radiant */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <TeamLogo teamId={teamRadiant.id} name={teamRadiant.name} logo={teamRadiant.logo} />
          <span className="font-mono font-bold text-[13px] truncate text-text-primary">
            {teamRadiant.name}
          </span>
        </div>

        {/* Center: score */}
        <div className="flex flex-col items-center shrink-0 gap-0.5">
          {liveGame && (
            <span className="text-[9px] font-mono font-bold" style={{ color: '#ff3d3d' }}>
              G{liveGame.gameNumber} · {formatTime(liveGame.gameTime ?? 0)}
            </span>
          )}
          {betweenGames && (
            <span className="text-[9px] font-mono text-text-muted">ПЕРЕРЫВ</span>
          )}
          <div className="flex items-baseline gap-1">
            <span
              className={`font-mono font-bold text-[32px] leading-none ${betweenGames ? 'text-text-muted' : ''}`}
              style={{ color: betweenGames ? undefined : '#00e5a0', letterSpacing: '-2px' }}
            >
              {betweenGames ? aWins : (liveGame?.radiantKills ?? 0)}
            </span>
            <span className="font-mono text-[22px] leading-none text-text-muted opacity-20">:</span>
            <span
              className={`font-mono font-bold text-[32px] leading-none ${betweenGames ? 'text-text-muted' : ''}`}
              style={{ color: betweenGames ? undefined : '#ff4f6a', letterSpacing: '-2px' }}
            >
              {betweenGames ? bWins : (liveGame?.direKills ?? 0)}
            </span>
          </div>
          {betweenGames && (
            <span className="text-[8px] font-mono uppercase tracking-wider text-text-muted opacity-50">Series</span>
          )}
        </div>

        {/* Dire */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <span className="font-mono font-bold text-[13px] truncate text-right text-text-primary">
            {teamDire.name}
          </span>
          <TeamLogo teamId={teamDire.id} name={teamDire.name} logo={teamDire.logo} />
        </div>
      </div>

      {/* Gold bar */}
      {liveGame && goldAbs > 0 && (
        <div className="px-3 pb-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-wider w-8 text-text-muted">Gold</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-bg-border">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(radiantAhead ? 50 + goldPct * 50 : 50 - goldPct * 50)}%`,
                  background: radiantAhead ? '#f5c842' : '#ff4f6a',
                  opacity: 0.8,
                  marginLeft: radiantAhead ? 0 : 'auto',
                }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold w-10 text-right"
              style={{ color: radiantAhead ? '#f5c842' : '#ff4f6a' }}>
              {radiantAhead ? '+' : '−'}{goldLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
