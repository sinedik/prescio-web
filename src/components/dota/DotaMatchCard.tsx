'use client'
import { useState } from 'react'
import type { DotaProMatch } from '../../types/dota'

function timeAgo(unixTs: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixTs)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function TeamLogo({ teamId, size = 28 }: { teamId: number | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (!teamId || failed) {
    return <div className="rounded shrink-0 bg-bg-elevated" style={{ width: size, height: size }} />
  }
  return (
    <div className="rounded overflow-hidden shrink-0 bg-bg-elevated" style={{ width: size, height: size }}>
      <img
        src={`https://cdn.cloudflare.steamstatic.com/apps/dota2/teamlogos/${teamId}.png`}
        alt=""
        className="w-full h-full object-contain"
        onError={() => setFailed(true)}
        draggable={false}
      />
    </div>
  )
}

interface Props {
  match: DotaProMatch
  onClick?: () => void
}

export default function DotaMatchCard({ match, onClick }: Props) {
  const radiantWon = match.radiantWin
  const boLabel = match.seriesType === 0 ? 'Bo1' : match.seriesType === 2 ? 'Bo5' : 'Bo3'

  const radiantNameColor = radiantWon === true ? '#00e5a0' : undefined
  const radiantNameClass = radiantWon === false ? 'text-text-muted' : radiantWon === true ? '' : 'text-text-primary'

  const direNameColor = radiantWon === false ? '#ff4f6a' : undefined
  const direNameClass = radiantWon === true ? 'text-text-muted' : radiantWon === false ? '' : 'text-text-primary'

  const radiantScoreColor = radiantWon === true ? '#00e5a0' : undefined
  const radiantScoreClass = radiantWon !== true ? 'text-text-secondary' : ''

  const direScoreColor = radiantWon === false ? '#ff4f6a' : undefined
  const direScoreClass = radiantWon !== false ? 'text-text-secondary' : ''

  return (
    <div
      className="flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors bg-bg-surface border border-bg-border hover:bg-bg-elevated"
      onClick={onClick}
    >
      {/* Radiant side */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <TeamLogo teamId={match.radiantTeamId} />
        <span
          className={`font-mono font-bold text-[12px] truncate ${radiantNameClass}`}
          style={radiantNameColor ? { color: radiantNameColor } : undefined}
        >
          {match.radiantName ?? 'Radiant'}
        </span>
      </div>

      {/* Score */}
      <div className="flex flex-col items-center shrink-0 gap-0.5">
        <div className="flex items-baseline gap-1">
          <span
            className={`font-mono font-bold text-[16px] ${radiantScoreClass}`}
            style={radiantScoreColor ? { color: radiantScoreColor } : undefined}
          >
            {match.radiantScore}
          </span>
          <span className="font-mono text-[12px] text-text-muted opacity-40">:</span>
          <span
            className={`font-mono font-bold text-[16px] ${direScoreClass}`}
            style={direScoreColor ? { color: direScoreColor } : undefined}
          >
            {match.direScore}
          </span>
        </div>
        {match.duration != null && (
          <span className="text-[8px] font-mono text-text-muted">
            {formatDuration(match.duration)}
          </span>
        )}
      </div>

      {/* Dire side */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span
          className={`font-mono font-bold text-[12px] truncate text-right ${direNameClass}`}
          style={direNameColor ? { color: direNameColor } : undefined}
        >
          {match.direName ?? 'Dire'}
        </span>
        <TeamLogo teamId={match.direTeamId} />
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end shrink-0 gap-0.5 ml-1">
        {match.leagueName && (
          <span className="text-[9px] font-mono truncate max-w-[80px] text-text-muted">
            {match.leagueName}
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {match.seriesType != null && (
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded font-bold bg-bg-elevated text-text-muted border border-bg-border">
              {boLabel}
            </span>
          )}
          {match.startTime && (
            <span className="text-[9px] font-mono text-text-muted">
              {timeAgo(match.startTime)}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
