'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePolling } from '../hooks/usePolling'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import { ErrorBoundary } from '../components/ErrorBoundary'
import MarketsPanel from '../components/esports/MarketsPanel'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import type { EsportsMatchDetail, EsportsGame, EsportsGameTeam, EsportsDraftAction, EsportsPlayer, EsportsTeamDetail, EsportsRound, EsportsPreMatch, EsportsRecentMatch } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtClock(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function fmtDuration(iso?: string): string {
  if (!iso || iso === 'PT0S') return ''
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!m) return ''
  const h = parseInt(m[1] ?? '0')
  const min = parseInt(m[2] ?? '0')
  const s = parseInt(m[3] ?? '0')
  if (h > 0) return `${h}:${String(min).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${min}:${String(s).padStart(2, '0')}`
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  if (diff > 0 && diff < 60 * 60_000) return `in ${Math.round(diff / 60000)}m`
  const hm = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = d.toDateString() === tomorrow.toDateString()
  if (sameDay)    return `Today · ${hm}`
  if (isTomorrow) return `Tomorrow · ${hm}`
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + hm
}

function gameLabel(sub?: string | null): string {
  if (!sub) return 'ESPORTS'
  if (sub.includes('dota')) return 'DOTA 2'
  if (sub.includes('cs') || sub.includes('csgo')) return 'CS2'
  if (sub.includes('valorant')) return 'VALORANT'
  return 'ESPORTS'
}

function fmtK(n?: number | null): string {
  if (n == null) return '—'
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

// Semantic palette — side colors, not brand colors.
const DOTA_RADIANT = '#4ade80'
const DOTA_DIRE    = '#ef4444'
const CS_CT        = '#6fa8dc'
const CS_T         = '#e8a33d'
const LIVE_RED     = '#ff3d3d'
const CS2_ACCENT   = '#ff6b2b'

function sideColorForCs(side?: string | null): string | null {
  const s = (side ?? '').toLowerCase()
  if (s === 'ct' || s === 'counter_terrorist' || s === 'counter-terrorist') return CS_CT
  if (s === 't'  || s === 'terrorist') return CS_T
  return null
}

// Deterministic accent color from team name (fallback when GRID has no color)
function nameToColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 52%)`
}

// Countdown to start time
function Countdown({ startsAt }: { startsAt: string }) {
  const [diff, setDiff] = useState(() => new Date(startsAt).getTime() - Date.now())
  useEffect(() => {
    const id = setInterval(() => setDiff(new Date(startsAt).getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [startsAt])
  if (diff <= 0) return <span className="text-[10px] font-mono text-text-muted">Starting soon</span>
  const totalSecs = Math.floor(diff / 1000)
  const d = Math.floor(totalSecs / 86400)
  const h = Math.floor((totalSecs % 86400) / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  const label = d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : m > 0 ? `${m}m ${String(s).padStart(2,'0')}s` : `${s}s`
  return (
    <span className="text-[11px] font-mono font-bold tabular-nums text-text-secondary">
      Starts in {label}
    </span>
  )
}

// ─── Live clock (ticks every second if ticking) ───────────────────────────────

function LiveClock({ initialSeconds, ticking, accent }: { initialSeconds: number; ticking: boolean; accent: string }) {
  const [secs, setSecs] = useState(initialSeconds)
  useEffect(() => {
    setSecs(initialSeconds)
    if (!ticking) return
    const id = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [initialSeconds, ticking])
  return (
    <span className="text-[13px] font-mono font-bold tabular-nums" style={{ color: accent }}>
      {fmtClock(secs)}
    </span>
  )
}

// ─── Team logo / initials ─────────────────────────────────────────────────────

function TeamLogo({ team, size = 40, circle }: { team: EsportsTeamDetail; size?: number; circle?: boolean }) {
  const [err, setErr] = useState(false)
  const color = team.colorPrimary ?? nameToColor(team.name ?? '?')
  const initials = (team.name ?? '?').slice(0, 2).toUpperCase()
  const borderStyle = circle ? { border: '0.5px solid rgba(var(--surface-tint-rgb),0.2)' } : {}
  if (team.logoUrl && !err) {
    return (
      <img
        src={team.logoUrl}
        alt={team.name}
        width={size}
        height={size}
        onError={() => setErr(true)}
        className={`object-contain ${circle ? 'rounded-full' : 'rounded'}`}
        style={{ width: size, height: size, ...borderStyle }}
      />
    )
  }
  return (
    <div
      className={`${circle ? 'rounded-full' : 'rounded'} flex items-center justify-center font-mono font-bold text-white shrink-0`}
      style={{ width: size, height: size, background: color, fontSize: size * 0.35, ...borderStyle }}
    >
      {initials}
    </div>
  )
}

// ─── Player scoreboard row ────────────────────────────────────────────────────

function PlayerRow({ player, accent, isDota, isCs2, completedRounds }: {
  player: EsportsPlayer; accent: string; isDota: boolean; isCs2?: boolean; completedRounds?: number
}) {
  const displayName = player.nickname ?? player.name ?? player.id
  const hasCs2Stats  = isCs2 && (player.damageDealt != null || player.headshots != null)
  const adr = isCs2 && player.damageDealt != null && completedRounds && completedRounds > 0
    ? Math.round(player.damageDealt / completedRounds)
    : null
  const healthPct    = player.currentHealth != null && player.currentHealth > 0
    ? Math.round((player.currentHealth / 100) * 100) : null
  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-text-primary/[0.02] transition-colors">
      {player.firstKill && (
        <span className="text-[8px] font-mono px-1 py-0.5 rounded shrink-0"
          style={{ background: `${accent}18`, color: accent, border: `1px solid ${accent}33` }}>FK</span>
      )}
      {isCs2 && player.alive === false && (
        <span className="text-[8px] font-mono text-red-500/60 shrink-0">✕</span>
      )}
      <span className="flex-1 text-[12px] font-mono text-text-secondary truncate">{displayName}</span>
      <span className="text-[12px] font-mono font-bold text-text-primary tabular-nums w-6 text-center">{player.kills}</span>
      <span className="text-[10px] font-mono text-text-muted/40">/</span>
      <span className="text-[12px] font-mono text-text-muted tabular-nums w-6 text-center">{player.deaths}</span>
      <span className="text-[10px] font-mono text-text-muted/40">/</span>
      <span className="text-[12px] font-mono text-text-muted/70 tabular-nums w-6 text-center">{player.assists}</span>
      {isDota && player.netWorth != null && (
        <span className="text-[10px] font-mono text-text-muted/60 tabular-nums w-12 text-right">{fmtK(player.netWorth)}</span>
      )}
      {hasCs2Stats && (
        <>
          {player.headshots != null && (
            <span className="text-[10px] font-mono text-yellow-500/70 tabular-nums w-8 text-right"
              title="Headshots">{player.headshots}HS</span>
          )}
          {adr != null && (
            <span className={`text-[10px] font-mono tabular-nums w-10 text-right ${adr >= 90 ? 'text-text-primary font-bold' : adr >= 75 ? 'text-text-secondary' : 'text-text-muted/60'}`}
              title={`ADR (avg damage / round), ${completedRounds} rnds`}>{adr}</span>
          )}
          {player.damageDealt != null && (
            <span className="text-[10px] font-mono text-text-muted/40 tabular-nums w-14 text-right"
              title="Total damage dealt">{player.damageDealt}</span>
          )}
          {player.currentHealth != null && player.alive !== false && (
            <span className="text-[10px] font-mono tabular-nums w-8 text-right"
              style={{ color: player.currentHealth > 50 ? '#4ade80' : player.currentHealth > 25 ? '#facc15' : '#f87171' }}
              title="HP">{player.currentHealth}hp</span>
          )}
          {player.money != null && (
            <span className="text-[10px] font-mono text-green-400/60 tabular-nums w-10 text-right"
              title="Money">${player.money}</span>
          )}
        </>
      )}
    </div>
  )
}

// ─── Map Veto (CS2 / Valorant) ────────────────────────────────────────────────

function MapVeto({ actions, teamA, teamB, accent }: {
  actions: EsportsDraftAction[]
  teamA: EsportsTeamDetail | null
  teamB: EsportsTeamDetail | null
  accent: string
}) {
  const maps = actions.filter(a => (a.itemType ?? '').toLowerCase() === 'map')
  if (!maps.length) return null
  const ordered = [...maps].sort((x, y) => Number(x.seq) - Number(y.seq))
  return (
    <div className="flex flex-col gap-1.5">
      {ordered.map((a, i) => {
        const isA = a.teamId === teamA?.id
        const isB = a.teamId === teamB?.id
        const team = isA ? teamA : isB ? teamB : null
        const isBan = a.type === 'ban'
        return (
          <div key={i} className="flex items-center gap-2 text-[11px] font-mono"
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              background: isBan ? 'rgba(255,50,50,0.04)' : (isA ? `${accent}0d` : 'rgba(var(--surface-tint-rgb),0.03)'),
              border: `1px solid ${isBan ? 'rgba(255,50,50,0.18)' : (isA ? `${accent}2a` : 'rgba(var(--surface-tint-rgb),0.08)')}`,
            }}>
            <span className="text-text-muted/60 w-5">{i + 1}.</span>
            <span className="uppercase tracking-wider text-[9px] w-8"
              style={{ color: isBan ? '#ff6b6b' : accent }}>
              {a.type}
            </span>
            <span className="flex-1 truncate" style={{
              color: isBan ? '#ff9a9a' : 'rgb(var(--text-primary))',
              textDecoration: isBan ? 'line-through' : undefined,
              opacity: isBan ? 0.75 : 1,
            }}>
              {a.heroName ?? '—'}
            </span>
            {team && (
              <span className="text-text-muted/70 truncate max-w-[120px]">
                {team.name}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── CS2 Minimap (player positions) ───────────────────────────────────────────

function Cs2Minimap({ teamA, teamB, accent }: {
  teamA: EsportsGameTeam | null
  teamB: EsportsGameTeam | null
  accent: string
}) {
  const all = [
    ...(teamA?.players ?? []).map(p => ({ p, side: 'A' as const })),
    ...(teamB?.players ?? []).map(p => ({ p, side: 'B' as const })),
  ].filter(({ p }) => p.position && typeof p.position.x === 'number' && typeof p.position.y === 'number')

  if (all.length < 2) return null

  const xs = all.map(({ p }) => p.position!.x)
  const ys = all.map(({ p }) => p.position!.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const pad = 200
  const rangeX = Math.max(maxX - minX, 1) + pad * 2
  const rangeY = Math.max(maxY - minY, 1) + pad * 2
  const size = 220

  const norm = (v: number, min: number, range: number) =>
    ((v - (min - pad)) / range) * size

  return (
    <div className="px-4 pb-3">
      <p className="text-[9px] font-mono text-text-muted/60 uppercase tracking-wider mb-1">Minimap</p>
      <div className="relative" style={{ width: size, height: size, margin: '0 auto' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
          style={{
            background: 'rgba(var(--surface-tint-rgb), 0.02)',
            border: '1px solid rgba(var(--surface-tint-rgb),0.08)',
            borderRadius: 8,
          }}>
          {/* Grid */}
          <line x1={size/2} y1={0} x2={size/2} y2={size} stroke="rgba(var(--surface-tint-rgb),0.04)" strokeDasharray="2 4" />
          <line x1={0} y1={size/2} x2={size} y2={size/2} stroke="rgba(var(--surface-tint-rgb),0.04)" strokeDasharray="2 4" />
          {all.map(({ p, side }) => {
            const cx = norm(p.position!.x, minX, rangeX)
            const cy = size - norm(p.position!.y, minY, rangeY)
            const alive = p.alive !== false
            const color = side === 'A' ? accent : 'rgb(var(--text-secondary))'
            return (
              <g key={p.id} opacity={alive ? 1 : 0.3}>
                <circle cx={cx} cy={cy} r={6} fill={color} stroke="rgba(0,0,0,0.5)" strokeWidth={1} />
                {!alive && (
                  <line x1={cx-4} y1={cy-4} x2={cx+4} y2={cy+4} stroke="#ff5252" strokeWidth={1.5} />
                )}
                <text x={cx} y={cy - 9} fontSize={7} fill="rgba(var(--surface-tint-rgb),0.7)"
                  textAnchor="middle" fontFamily="monospace">
                  {(p.name ?? '').slice(0, 6)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// ─── Game card ────────────────────────────────────────────────────────────────

function GamesTabs({ games, teamA, teamB, isDota, isCs2, accent }: {
  games: EsportsGame[]
  teamA: EsportsTeamDetail
  teamB: EsportsTeamDetail
  isDota: boolean
  isCs2?: boolean
  accent: string
}) {
  const { lang } = useLang()
  const t = useT(lang)
  const liveIdx = games.findIndex(g => g.started && !g.finished)
  const defaultIdx = liveIdx >= 0 ? liveIdx : games.length - 1
  const [active, setActive] = useState(defaultIdx)
  useEffect(() => { setActive(defaultIdx) }, [defaultIdx])

  const sel = games[Math.min(active, games.length - 1)] ?? games[0]
  const labelFor = (g: EsportsGame) => isDota ? `Game ${g.seq}` : `Map ${g.seq}`

  const anyLive = liveIdx >= 0
  const anyFinished = games.some(g => g.finished)
  const lastFinishedSeq = [...games].reverse().find(g => g.finished)?.seq
  const nextUpSeq = games.find(g => !g.started && !g.finished)?.seq
  const inIntermission = !anyLive && anyFinished && nextUpSeq != null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
          {isDota ? 'Games' : 'Maps'}
        </p>
        <span className="text-[9px] font-mono text-text-muted/50">
          {t('esports.click_to_open')}
        </span>
      </div>

      {/* Intermission banner */}
      {inIntermission && (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold px-1.5 py-[1px] rounded uppercase tracking-wider"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
            {t('esports.halftime')}
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            {isDota ? `Game ${lastFinishedSeq}` : `Map ${lastFinishedSeq}`} {t('esports.finished_waiting')} {isDota ? `Game ${nextUpSeq}` : `Map ${nextUpSeq}`}
          </span>
        </div>
      )}

      {/* Tabs strip */}
      <div role="tablist" aria-label={isDota ? 'Games' : 'Maps'}
        className="flex gap-1.5 overflow-x-auto scrollbar-thin -mx-1 px-1">
        {games.map((g, i) => {
          const gLive = g.started && !g.finished
          const gFin  = g.finished
          const gUpcoming = !g.started && !g.finished
          const gA = g.teamA, gB = g.teamB
          const aWon = gA?.won, bWon = gB?.won
          const isActive = i === active
          const hasScore = gA?.score != null && gB?.score != null
          return (
            <button
              key={g.seq}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={gFin ? t('map.watching') : gLive ? t('map.live') : t('map.not_started')}
              onClick={() => setActive(i)}
              className={`shrink-0 flex flex-col items-start gap-0.5 px-3 py-2 rounded-md border cursor-pointer transition-all ${
                isActive
                  ? 'bg-bg-surface border-bg-border shadow-sm'
                  : 'bg-bg-surface/40 border-bg-border/40 hover:bg-bg-surface hover:border-bg-border hover:-translate-y-[1px]'
              } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-primary`}
              style={{
                ...(isActive ? { borderTop: `2px solid ${accent}` } : {}),
              }}
            >
              <span className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isActive ? 'text-text-primary' : 'text-text-secondary'}`}>
                  {labelFor(g)}
                </span>
                {gLive && (
                  <span className="inline-flex items-center gap-1 text-[8px] font-mono font-bold px-1 py-[1px] rounded"
                    style={{ background: 'rgba(255,61,61,0.15)', color: '#ff3d3d', border: '1px solid rgba(255,61,61,0.25)' }}>
                    <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />LIVE
                  </span>
                )}
                {gFin && (
                  <span className="text-[8px] font-mono font-bold px-1 py-[1px] rounded bg-bg-elevated/60 text-text-muted/70">
                    FIN
                  </span>
                )}
                {gUpcoming && (
                  <span className="text-[8px] font-mono text-text-muted/40">SOON</span>
                )}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono tabular-nums">
                {hasScore ? (
                  <>
                    <span className={aWon ? 'font-bold' : 'text-text-muted/60'} style={aWon ? { color: accent } : undefined}>
                      {gA?.score}
                    </span>
                    <span className="text-text-muted/45">:</span>
                    <span className={bWon ? 'font-bold' : 'text-text-muted/60'} style={bWon ? { color: accent } : undefined}>
                      {gB?.score}
                    </span>
                  </>
                ) : gLive ? (
                  <span className="text-text-muted/50">in progress</span>
                ) : gUpcoming ? (
                  <span className="text-text-muted/45">not started</span>
                ) : (
                  <span className="text-text-muted/45">—</span>
                )}
                {g.map && <span className="text-text-muted/40 ml-1 truncate max-w-[80px]">{g.map}</span>}
              </span>
            </button>
          )
        })}
      </div>
      {/* Active game */}
      {sel && (() => {
        const selLabel = labelFor(sel)
        const selFin = sel.finished
        const selLive = sel.started && !sel.finished
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 px-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider" style={{ color: selLive ? '#ff3d3d' : accent }}>
                {t('esports.viewing')} {selLabel}
              </span>
              {selFin && <span className="text-[9px] font-mono text-text-muted/50">{t('esports.map_finished')}</span>}
              {selLive && <span className="text-[9px] font-mono text-text-muted/70">{t('esports.map_live')}</span>}
            </div>
            <GameCard
              key={sel.seq}
              game={sel}
              teamA={teamA}
              teamB={teamB}
              isDota={isDota}
              isCs2={isCs2}
              accent={accent}
            />
          </div>
        )
      })()}
    </div>
  )
}

const ROUNDS_DEFAULT = 15

function RoundTimeline({ rounds, teamAName, teamBName }: {
  rounds: EsportsRound[]
  teamAName?: string
  teamBName?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const winIcon = (winType?: string | null): string => {
    const t = (winType ?? '').toLowerCase()
    if (t.includes('defus')) return '✂'
    if (t.includes('detonat') || t.includes('bomb_expl') || t.includes('target_bombed')) return '✸'
    if (t.includes('time') || t.includes('expir') || t.includes('saved')) return '⏱'
    if (t.includes('eliminat') || t.includes('kill')) return '✕'
    return '•'
  }
  const sideOf = (r: EsportsRound, winner: 'A' | 'B'): string | null => {
    const t = winner === 'A' ? r.teamA : r.teamB
    return (t?.side ?? '').toLowerCase() || null
  }
  const visible = expanded || rounds.length <= ROUNDS_DEFAULT ? rounds : rounds.slice(-ROUNDS_DEFAULT)
  let aCount = 0, bCount = 0
  return (
    <div className="flex flex-col gap-1 py-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider">Round timeline</span>
        <div className="flex items-center gap-2">
          {rounds.length > ROUNDS_DEFAULT && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-[9px] font-mono text-text-muted/60 hover:text-text-muted transition-colors"
            >
              {expanded ? 'show less' : `all ${rounds.length}`}
            </button>
          )}
          <span className="text-[9px] font-mono text-text-muted/40 tabular-nums">
            {rounds.filter(r => r.teamA?.won).length} : {rounds.filter(r => r.teamB?.won).length}
          </span>
        </div>
      </div>
      <div className="flex gap-0.5 overflow-x-auto scrollbar-thin pb-1">
        {visible.map(r => {
          const aWon = !!r.teamA?.won
          const bWon = !!r.teamB?.won
          const winner: 'A' | 'B' | null = aWon ? 'A' : bWon ? 'B' : null
          const side = winner ? sideOf(r, winner) : null
          const col = side === 'ct' || side === 'counter_terrorist'
            ? CS_CT
            : side === 't' || side === 'terrorist'
            ? CS_T
            : winner === 'A' ? '#7e8494' : winner === 'B' ? '#5a6070' : 'transparent'
          if (winner === 'A') aCount++
          if (winner === 'B') bCount++
          const tName = winner === 'A' ? teamAName : winner === 'B' ? teamBName : '—'
          const wt = winner === 'A' ? r.teamA?.winType : r.teamB?.winType
          const half = r.round === 13 ? 'mr12' : r.round === 25 ? 'ot-start' : null
          const tip = `Round ${r.round} · ${tName ?? ''}${wt ? ` · ${wt}` : ''} · ${aCount}:${bCount}`
          const isLive = r.started && !r.finished
          return (
            <div key={r.round} className="flex items-center">
              {half && <div className="w-px h-7 mx-0.5 bg-bg-border/60" aria-hidden />}
              <div
                title={tip}
                className="w-5 h-7 rounded-sm flex flex-col items-center justify-center font-mono shrink-0"
                style={{
                  background: winner ? `${col}29` : isLive ? 'rgba(255,61,61,0.12)' : 'rgba(var(--surface-tint-rgb),0.03)',
                  border: `1px solid ${winner ? `${col}66` : isLive ? `${LIVE_RED}66` : 'rgba(var(--surface-tint-rgb),0.06)'}`,
                }}
              >
                <span className="text-[8px] leading-none" style={{ color: winner ? col : isLive ? LIVE_RED : 'rgba(var(--surface-tint-rgb),0.25)' }}>
                  {winner ? winIcon(wt) : isLive ? '●' : '·'}
                </span>
                <span className="text-[7px] leading-none mt-0.5 tabular-nums"
                  style={{ color: winner ? `${col}cc` : 'rgba(var(--surface-tint-rgb),0.3)' }}>
                  {r.round}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function GameCard({ game, teamA, teamB, isDota, isCs2, accent }: {
  game: EsportsGame
  teamA: EsportsTeamDetail
  teamB: EsportsTeamDetail
  isDota: boolean
  isCs2?: boolean
  accent: string
}) {
  const isLive     = game.started && !game.finished
  const isFinished = game.finished
  const gA = game.teamA
  const gB = game.teamB
  const hasPlayers = (gA?.players?.length ?? 0) > 0 || (gB?.players?.length ?? 0) > 0
  const hasDraft   = (game.draft?.length ?? 0) > 0

  // Side semantics: Dota → Radiant/Dire; CS → CT/T (swaps half-time).
  const colorA = isDota ? DOTA_RADIANT : (sideColorForCs(gA?.side) ?? accent)
  const colorB = isDota ? DOTA_DIRE    : (sideColorForCs(gB?.side) ?? '#a8adb8')
  const sideLabelA = isDota ? 'RAD' : (sideColorForCs(gA?.side) ? gA?.side?.toUpperCase() : null)
  const sideLabelB = isDota ? 'DIR' : (sideColorForCs(gB?.side) ? gB?.side?.toUpperCase() : null)

  return (
    <div
      className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden"
      style={isLive ? { borderLeft: `3px solid ${LIVE_RED}` } : undefined}
    >
      {/* Header row */}
      <div className="px-4 py-3 flex items-center gap-3">
        {/* Label */}
        <div className="shrink-0 w-16">
          <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
            {isDota ? `Game ${game.seq}` : `Map ${game.seq}`}
          </p>
          {game.map && <p className="text-[11px] font-mono font-bold text-text-primary mt-0.5 truncate">{game.map}</p>}
        </div>

        {/* Teams + score */}
        <div className="flex-1 flex items-center gap-2">
          <div className={`flex-1 flex items-center gap-1.5 ${gA?.won ? '' : isFinished ? 'opacity-40' : ''}`}>
            <span className="text-[12px] font-mono font-medium truncate"
              style={{ color: gA?.won ? colorA : undefined }}>{teamA.name}</span>
            {sideLabelA && (
              <span className="text-[8px] font-mono font-bold shrink-0 px-1 py-[1px] rounded"
                style={{ color: colorA, background: `${colorA}1f`, border: `1px solid ${colorA}33` }}>
                {sideLabelA}
              </span>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2 font-mono">
            {gA?.score != null && gB?.score != null ? (
              <>
                <span className={`text-base font-bold ${gA?.won ? '' : 'text-text-muted'}`}
                  style={{ color: gA?.won ? colorA : undefined }}>{gA.score}</span>
                <span className="text-text-muted/45 text-sm">:</span>
                <span className={`text-base font-bold ${gB?.won ? '' : 'text-text-muted'}`}
                  style={{ color: gB?.won ? colorB : undefined }}>{gB.score}</span>
              </>
            ) : isLive ? (
              <span className="text-[9px] font-mono animate-pulse px-1.5 py-0.5 rounded"
                style={{ background: `${LIVE_RED}1f`, color: LIVE_RED }}>LIVE</span>
            ) : (
              <span className="text-text-muted/45 text-sm">—</span>
            )}
          </div>

          <div className={`flex-1 flex items-center justify-end gap-1.5 ${gB?.won ? '' : isFinished ? 'opacity-40' : ''}`}>
            {sideLabelB && (
              <span className="text-[8px] font-mono font-bold shrink-0 px-1 py-[1px] rounded"
                style={{ color: colorB, background: `${colorB}1f`, border: `1px solid ${colorB}33` }}>
                {sideLabelB}
              </span>
            )}
            <span className="text-[12px] font-mono font-medium truncate text-right"
              style={{ color: gB?.won ? colorB : undefined }}>{teamB.name}</span>
          </div>
        </div>

        {/* Status + clock */}
        <div className="shrink-0 w-16 text-right flex flex-col items-end gap-0.5">
          {isLive && game.clock && (
            <LiveClock initialSeconds={game.clock.currentSeconds} ticking={game.clock.ticking} accent={LIVE_RED} />
          )}
          {isLive && !game.clock && (
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${LIVE_RED}26`, color: LIVE_RED }}>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
            </span>
          )}
          {isFinished && <span className="text-[9px] font-mono text-text-muted">FIN</span>}
          {/* Kill totals */}
          {(gA?.kills != null || gB?.kills != null) && (
            <span className="text-[9px] font-mono text-text-muted/50">
              {gA?.kills ?? 0}K : {gB?.kills ?? 0}K
            </span>
          )}
        </div>
      </div>

      {/* Round timeline (CS2) */}
      {(game.rounds?.length ?? 0) > 0 && (
        <div className="px-4 pb-2 pt-0 border-t border-bg-border/40">
          <RoundTimeline rounds={game.rounds} teamAName={teamA.name} teamBName={teamB.name} />
        </div>
      )}

      {/* Economy bar (CS2) */}
      {isCs2 && (gA?.loadoutValue != null || gB?.loadoutValue != null) && (() => {
        const aLoad = gA?.loadoutValue ?? 0
        const bLoad = gB?.loadoutValue ?? 0
        const total = aLoad + bLoad
        const aPct = total > 0 ? (aLoad / total) * 100 : 50
        return (
          <div className="px-4 pb-2 pt-2 border-t border-bg-border/40 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider">Economy</span>
              <span className="text-[9px] font-mono text-text-muted/40">equipment value</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tabular-nums shrink-0 w-14" style={{ color: colorA }}>
                ${aLoad.toLocaleString()}
              </span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden flex" style={{ background: 'rgba(var(--surface-tint-rgb), 0.04)' }}>
                <div className="h-full transition-all duration-500" style={{ width: `${aPct}%`, background: colorA }} />
                <div className="h-full transition-all duration-500" style={{ width: `${100 - aPct}%`, background: colorB }} />
              </div>
              <span className="text-[10px] font-mono tabular-nums shrink-0 w-14 text-right" style={{ color: colorB }}>
                ${bLoad.toLocaleString()}
              </span>
            </div>
          </div>
        )
      })()}

      {/* Player scoreboards */}
      {hasPlayers && (() => {
        const completedRounds = game.rounds?.filter(r => r.finished).length ?? 0
        return (
        <div className="border-t border-bg-border/50 px-2 pb-2 pt-1">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-2 pb-1">
            <span className="flex-1 text-[9px] font-mono text-text-muted/40 uppercase tracking-wider">Player</span>
            <span className="text-[9px] font-mono text-text-muted/40 w-6 text-center">K</span>
            <span className="text-[10px] font-mono text-text-muted/35">/</span>
            <span className="text-[9px] font-mono text-text-muted/40 w-6 text-center">D</span>
            <span className="text-[10px] font-mono text-text-muted/35">/</span>
            <span className="text-[9px] font-mono text-text-muted/40 w-6 text-center">A</span>
            {isDota && <span className="text-[9px] font-mono text-text-muted/40 w-12 text-right">NW</span>}
            {isCs2 && <span className="text-[9px] font-mono text-yellow-500/40 w-8 text-right">HS</span>}
            {isCs2 && completedRounds > 0 && <span className="text-[9px] font-mono text-text-muted/40 w-10 text-right" title={`ADR = damage / ${completedRounds} rounds`}>ADR</span>}
            {isCs2 && <span className="text-[9px] font-mono text-text-muted/45 w-14 text-right">DMG</span>}
            {isCs2 && <span className="text-[9px] font-mono text-green-500/40 w-8 text-right">HP</span>}
          </div>

          {/* Team A players */}
          {(gA?.players?.length ?? 0) > 0 && (
            <div className="mb-1">
              <div className="flex items-center gap-1 px-2 mb-0.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colorA }} />
                <span className="text-[9px] font-mono text-text-muted/60">{teamA.name}</span>
              </div>
              {gA!.players!.map(p => (
                <PlayerRow key={p.id} player={p} accent={colorA} isDota={isDota} isCs2={isCs2} completedRounds={completedRounds} />
              ))}
            </div>
          )}

          {/* Team B players */}
          {(gB?.players?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-1 px-2 mb-0.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colorB }} />
                <span className="text-[9px] font-mono text-text-muted/60">{teamB.name}</span>
              </div>
              {gB!.players!.map(p => (
                <PlayerRow key={p.id} player={p} accent={colorB} isDota={isDota} isCs2={isCs2} completedRounds={completedRounds} />
              ))}
            </div>
          )}
        </div>
        )
      })()}

      {/* CS2 minimap */}
      {isCs2 && isLive && <Cs2Minimap teamA={gA} teamB={gB} accent={accent} />}

      {/* CS2 rounds history */}
      {isCs2 && (game.rounds?.length ?? 0) > 0 && (
        <RoundsHistory rounds={game.rounds} teamAName={teamA.name ?? '—'} teamBName={teamB.name ?? '—'} accent={accent} />
      )}
    </div>
  )
}

// ─── CS2 Rounds history ───────────────────────────────────────────────────────

function winTypeIcon(wt?: string | null): string {
  if (!wt) return '•'
  const s = wt.toLowerCase()
  if (s.includes('bomb') && s.includes('defus')) return '✂'
  if (s.includes('bomb')) return '✸'
  if (s.includes('saved') || s.includes('timeout')) return '⧗'
  if (s.includes('elim') || s.includes('kill')) return '☠'
  return '•'
}

function sideColor(side?: string | null): string {
  const s = (side ?? '').toLowerCase()
  if (s.includes('t') && !s.includes('ct')) return '#d4a43a' // T
  if (s.includes('ct')) return '#4a9eda' // CT
  return '#888'
}

function computeRoundMvp(r: EsportsRound): { name: string | null; kills: number } | null {
  const all = [...(r.teamA?.players ?? []), ...(r.teamB?.players ?? [])]
  if (!all.length) return null
  const top = all.reduce((best, p) =>
    (p.kills ?? 0) > (best.kills ?? 0) ? p : best, all[0])
  if ((top.kills ?? 0) < 1) return null
  return { name: top.name ?? null, kills: top.kills ?? 0 }
}

function RoundsHistory({ rounds, teamAName, teamBName, accent }: {
  rounds: EsportsRound[]
  teamAName: string
  teamBName: string
  accent: string
}) {
  const finished = rounds.filter(r => r.finished)
  if (!finished.length) return null

  const aWins = finished.filter(r => r.teamA?.won).length
  const bWins = finished.filter(r => r.teamB?.won).length

  // Pistol rounds (1 and 13 — half-time swap in MR12)
  const pistolNums = new Set([1, 13])

  return (
    <div className="border-t border-bg-border/50 px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono text-text-muted/40 uppercase tracking-wider">Rounds</span>
        <span className="text-[10px] font-mono font-bold text-text-secondary tabular-nums">{aWins} : {bWins}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {finished.map((r, i) => {
          const aWon = r.teamA?.won === true
          const winner = aWon ? r.teamA : r.teamB
          const winType = winner?.winType
          const mvp = computeRoundMvp(r)
          const sideCol = sideColor(winner?.side)
          const isPistol = pistolNums.has(r.round)
          const icon = winTypeIcon(winType)
          const title =
            `Rd ${r.round}: ${aWon ? teamAName : teamBName} (${winner?.side ?? '?'})` +
            `${winType ? ` — ${winType}` : ''}` +
            `${mvp ? ` — MVP ${mvp.name ?? '?'} (${mvp.kills}k)` : ''}` +
            `${isPistol ? ' — pistol' : ''}`
          return (
            <div key={i} title={title}
              className="relative flex items-center justify-center cursor-default"
              style={{
                width: 18, height: 22, borderRadius: 3,
                background: aWon ? `${sideCol}22` : 'rgba(var(--surface-tint-rgb),0.04)',
                border: `1px solid ${aWon ? sideCol : 'rgba(var(--surface-tint-rgb),0.08)'}`,
                boxShadow: isPistol ? `inset 0 -2px 0 ${accent}` : undefined,
              }}>
              <span className="text-[9px] font-mono" style={{ color: aWon ? sideCol : 'rgba(var(--surface-tint-rgb),0.25)' }}>
                {icon}
              </span>
              {mvp && (mvp.kills >= 3) && (
                <span className="absolute -top-1 -right-1 text-[6px] font-mono font-bold px-0.5 rounded-sm"
                  style={{ background: '#ffd84a', color: '#000' }}>
                  {mvp.kills}K
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[8px] font-mono text-text-muted/50">
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#d4a43a' }} /> T
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm" style={{ background: '#4a9eda' }} /> CT
        </span>
        <span>✸ bomb · ✂ defuse · ⧗ save · ☠ elim</span>
      </div>
    </div>
  )
}

// ─── Pre-match section ───────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function parseTwitchChannel(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('twitch')) return null
    const seg = u.pathname.split('/').filter(Boolean)
    return seg[0] || null
  } catch { return null }
}

function parseYouTubeVideoId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null
    if (u.hostname.includes('youtube')) {
      if (u.pathname.startsWith('/watch')) return u.searchParams.get('v')
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2] || null
      if (u.pathname.startsWith('/live/'))  return u.pathname.split('/')[2] || null
    }
    return null
  } catch { return null }
}

function StreamPlayer({ urls }: { urls: string[] }) {
  const [idx, setIdx] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const playable = urls.map(u => {
    const t = parseTwitchChannel(u)
    if (t) return { url: u, kind: 'twitch' as const, id: t }
    const y = parseYouTubeVideoId(u)
    if (y) return { url: u, kind: 'youtube' as const, id: y }
    return null
  }).filter(Boolean) as { url: string; kind: 'twitch' | 'youtube'; id: string }[]
  if (!playable.length) return null
  const cur = playable[Math.min(idx, playable.length - 1)]
  const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const src = cur.kind === 'twitch'
    ? `https://player.twitch.tv/?channel=${cur.id}&parent=${parent}&muted=true`
    : `https://www.youtube.com/embed/${cur.id}?autoplay=0&mute=1`

  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border/60">
        <div className="flex items-center gap-1.5">
          {playable.map((s, i) => (
            <button key={s.url} onClick={() => setIdx(i)}
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded transition-colors"
              style={{
                background: i === idx ? 'rgba(145,70,255,0.18)' : 'rgba(var(--surface-tint-rgb),0.04)',
                color: i === idx ? '#b388ff' : 'rgb(var(--text-muted))',
                border: `1px solid ${i === idx ? 'rgba(145,70,255,0.35)' : 'rgba(var(--surface-tint-rgb),0.08)'}`,
              }}>
              {s.kind === 'twitch' ? 'Twitch' : 'YouTube'} · {s.id.slice(0, 14)}
            </button>
          ))}
        </div>
        <button onClick={() => setExpanded(v => !v)}
          className="text-[10px] font-mono text-text-muted/60 hover:text-text-primary transition-colors">
          {expanded ? '▼ hide' : '▶ show'}
        </button>
      </div>
      {expanded && (
        <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            key={cur.url}
            src={src}
            allowFullScreen
            allow="autoplay; fullscreen"
            className="absolute inset-0 w-full h-full"
            style={{ border: 0 }}
          />
        </div>
      )}
    </div>
  )
}

function streamLabel(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host.includes('twitch')) return 'Twitch'
    if (host.includes('youtube') || host.includes('youtu.be')) return 'YouTube'
    if (host.includes('huya'))    return 'Huya'
    if (host.includes('afreeca')) return 'AfreecaTV'
    return host.split('.')[0]
  } catch { return 'Stream' }
}

function RecentFormStrip({ matches, accent }: { matches: EsportsRecentMatch[]; accent: string }) {
  const { lang } = useLang()
  const t = useT(lang)
  const finished = matches.filter(m => m.finished && m.outcome)
  if (!matches.length) return (
    <span className="text-[10px] font-mono text-text-muted/40">{t('esports.no_recent_data')}</span>
  )
  return (
    <div className="flex gap-0.5">
      {matches.slice(0, 5).map(m => {
        const isW = m.outcome === 'W'
        const isL = m.outcome === 'L'
        const bg  = isW ? accent : isL ? 'rgba(255,77,77,0.4)' : 'rgba(var(--surface-tint-rgb),0.08)'
        const label = m.outcome ?? '?'
        const score = m.scoreSelf != null && m.scoreOpp != null ? ` ${m.scoreSelf}:${m.scoreOpp}` : ''
        const title = `${m.outcome ?? 'TBD'} vs ${m.opponent?.name ?? '?'}${score} · ${m.tournament ?? ''} · ${fmtDate(m.startsAt)}`
        return (
          <div key={m.seriesId} title={title}
            className="w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-mono font-bold text-white"
            style={{ background: bg }}>
            {label}
          </div>
        )
      })}
      {!finished.length && <span className="text-[9px] font-mono text-text-muted/40 ml-1">{t('esports.no_results')}</span>}
    </div>
  )
}

function RecentMatchRow({ m }: { m: EsportsRecentMatch }) {
  const color = m.outcome === 'W' ? '#4ade80' : m.outcome === 'L' ? '#f87171' : '#888'
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-text-primary/[0.02] transition-colors">
      <span className="text-[10px] font-mono font-bold w-4 text-center" style={{ color }}>
        {m.outcome ?? '—'}
      </span>
      <span className="flex-1 text-[11px] font-mono text-text-secondary truncate">
        vs {m.opponent?.name ?? '?'}
      </span>
      {m.scoreSelf != null && m.scoreOpp != null && (
        <span className="text-[10px] font-mono font-bold text-text-primary tabular-nums shrink-0">
          {m.scoreSelf}:{m.scoreOpp}
        </span>
      )}
      {m.format && (
        <span className="text-[9px] font-mono text-text-muted/40 shrink-0">{m.format}</span>
      )}
      <span className="text-[9px] font-mono text-text-muted/40 shrink-0 truncate max-w-[80px]"
        title={m.tournament ?? ''}>{m.tournament ?? ''}</span>
      <span className="text-[9px] font-mono text-text-muted/45 shrink-0 tabular-nums w-12 text-right">
        {fmtDate(m.startsAt)}
      </span>
    </div>
  )
}

function PreMatchSection({ pre, teamAName, teamBName, accent }: {
  pre: EsportsPreMatch
  teamAName: string
  teamBName: string
  accent: string
}) {
  const hasTournament = !!pre.tournament
  const hasStreams    = pre.streams.length > 0
  const hasRecent     = pre.recentA.length > 0 || pre.recentB.length > 0
  const hasH2H        = pre.h2h.matches.length > 0

  if (!hasTournament && !hasStreams && !hasRecent && !hasH2H) return null

  const totalH2H = pre.h2h.winsA + pre.h2h.winsB
  const pctA = totalH2H > 0 ? Math.round((pre.h2h.winsA / totalH2H) * 100) : null

  return (
    <div className="flex flex-col gap-3">
      {/* Tournament card */}
      {hasTournament && pre.tournament && (
        <div className="bg-bg-surface border border-bg-border rounded-lg px-4 py-3 flex items-center gap-3">
          {pre.tournament.logoUrl && (
            <img src={pre.tournament.logoUrl} alt={pre.tournament.name}
              className="w-10 h-10 object-contain shrink-0"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-mono font-bold text-text-primary truncate">
              {pre.tournament.name}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
              {pre.tournament.startDate && pre.tournament.endDate && (
                <span className="text-[9px] font-mono text-text-muted/60">
                  {fmtDate(pre.tournament.startDate)} – {fmtDate(pre.tournament.endDate)}
                </span>
              )}
              {pre.tournament.prizePool != null && pre.tournament.prizePool > 0 && (
                <span className="text-[9px] font-mono text-yellow-500/70">
                  ${pre.tournament.prizePool.toLocaleString()} prize pool
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Streams */}
      {hasStreams && (
        <div className="bg-bg-surface border border-bg-border rounded-lg px-4 py-3">
          <p className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider mb-2">Streams</p>
          <div className="flex flex-wrap gap-2">
            {pre.streams.map(url => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-colors hover:opacity-80"
                style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}33` }}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 3h7v7M10 14L21 3M21 14v7h-7M3 10V3h7M3 14l11 7"/>
                </svg>
                {streamLabel(url)}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* H2H */}
      {hasH2H && totalH2H > 0 && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Head-to-head</span>
            <span className="text-[9px] font-mono text-text-muted/50">{totalH2H} match{totalH2H !== 1 ? 'es' : ''}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-text-primary w-24 truncate">{teamAName}</span>
            <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden flex">
              <div className="h-full transition-all duration-500"
                style={{ width: `${pctA}%`, background: accent }} />
              <div className="h-full transition-all duration-500 bg-red-400/50"
                style={{ width: `${100 - (pctA ?? 0)}%` }} />
            </div>
            <span className="text-[11px] font-mono text-text-primary w-24 truncate text-right">{teamBName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[13px] font-mono font-bold" style={{ color: accent }}>{pre.h2h.winsA}</span>
            <span className="text-[13px] font-mono font-bold text-red-400/70">{pre.h2h.winsB}</span>
          </div>
          <div className="mt-3 border-t border-bg-border/40 pt-2 flex flex-col gap-0.5">
            {pre.h2h.matches.slice(0, 3).map(m => (
              <RecentMatchRow key={m.seriesId} m={m} />
            ))}
          </div>
        </div>
      )}

      {/* Recent form (two columns) */}
      {hasRecent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[{ name: teamAName, matches: pre.recentA, isA: true },
            { name: teamBName, matches: pre.recentB, isA: false }].map(({ name, matches, isA }) => (
            <div key={name} className="bg-bg-surface border border-bg-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-text-primary font-bold truncate">{name}</span>
                <RecentFormStrip matches={matches} accent={isA ? accent : '#888'} />
              </div>
              <div className="flex flex-col gap-0.5 mt-2">
                {matches.length === 0 && (
                  <span className="text-[10px] font-mono text-text-muted/40 text-center py-2">
                    No recent matches
                  </span>
                )}
                {matches.slice(0, 5).map(m => (
                  <RecentMatchRow key={m.seriesId} m={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Win probability bar ──────────────────────────────────────────────────────

function WinProbBlock({ yesPrice, noPrice, teamA, teamB, markets }: {
  yesPrice: number; noPrice: number; teamA: string; teamB: string
  markets?: import('../types').EsportsMarket[]
}) {
  if (markets && markets.length > 0) return null // handled by BettingTab
  const pct = Math.round(yesPrice * 100)
  if (!pct || yesPrice === 0.5) return null
  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">WIN PROBABILITY · PREDICTION MARKETS</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[9px] font-mono w-7 shrink-0" style={{ color: 'rgb(var(--alpha))' }}>YES</span>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden flex">
          <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, background: 'rgb(var(--alpha))' }} />
          <div className="h-full transition-all duration-500" style={{ width: `${100 - pct}%`, background: 'rgb(var(--danger))' }} />
        </div>
        <span className="text-[11px] font-mono font-medium w-10 text-right" style={{ color: 'rgb(var(--alpha))' }}>{pct}%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-mono w-7 shrink-0" style={{ color: 'rgb(var(--danger))' }}>NO</span>
        <div className="flex-1" />
        <span className="text-[11px] font-mono font-medium w-10 text-right" style={{ color: 'rgb(var(--danger))' }}>{100 - pct}%</span>
      </div>
      <p className="text-[8px] font-mono text-text-muted/50 mt-1.5 text-right">
        {teamA} vs {teamB} · Polymarket / Kalshi
      </p>
    </div>
  )
}

// ─── Hero: maps bar ───────────────────────────────────────────────────────────

function sideLabel(side?: string | null) {
  const s = (side ?? '').toLowerCase()
  if (s === 'ct' || s.includes('counter')) return 'CT'
  if (s === 't' || s === 'terrorist') return 'T'
  return null
}

function SideBadge({ side }: { side?: string | null }) {
  const label = sideLabel(side)
  if (!label) return null
  const isCt = label === 'CT'
  return (
    <span className="text-[7px] font-mono font-bold px-1 py-[1px] rounded"
      style={isCt
        ? { background: 'rgba(var(--poly),0.18)', color: 'rgb(var(--poly))' }
        : { background: 'rgba(var(--watch),0.18)', color: 'rgb(var(--watch))' }}>
      {label}
    </span>
  )
}

function Cs2MapsBar({ games, teamAName, teamBName }: {
  games: EsportsGame[]; teamAName: string; teamBName: string
}) {
  if (!games.length) return null
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 14px 12px', overflowX: 'auto' }}>
      {games.map(g => {
        const isLiveG    = g.started && !g.finished
        const isFinishedG = g.finished
        const isPending  = !g.started && !g.finished
        const aWon = g.teamA?.won
        const bWon = g.teamB?.won
        const sA = g.teamA?.score
        const sB = g.teamB?.score
        const currentRound = isLiveG && g.rounds ? g.rounds.filter(r => r.started).length : null
        const mapLabel = `MAP ${g.seq}${g.map ? ` · ${g.map.toUpperCase()}` : ''}`

        const borderColor = isLiveG
          ? CS2_ACCENT
          : isFinishedG
            ? (aWon ? 'rgba(var(--alpha),0.4)' : bWon ? 'rgba(var(--danger),0.4)' : 'rgba(var(--surface-tint-rgb),0.1)')
            : 'rgba(var(--surface-tint-rgb),0.1)'

        return (
          <div key={g.seq} style={{
            flex: 1, minWidth: 80, padding: '6px 8px', borderRadius: 6,
            border: `1px solid ${borderColor}`,
            background: isLiveG ? `${CS2_ACCENT}08` : 'rgba(var(--surface-tint-rgb),0.02)',
            opacity: isPending ? 0.35 : 1,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(var(--surface-tint-rgb),0.45)' }}>
                {mapLabel}
              </span>
              {isLiveG && currentRound != null && (
                <span style={{ fontSize: 7, fontFamily: 'monospace', fontWeight: 700, color: CS2_ACCENT }}>
                  ● R{currentRound}
                </span>
              )}
              {isLiveG && currentRound == null && (
                <span style={{ fontSize: 7, fontFamily: 'monospace', fontWeight: 700, color: CS2_ACCENT }}>● LIVE</span>
              )}
              {isPending && (
                <span style={{ fontSize: 7, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)' }}>PENDING</span>
              )}
              {isFinishedG && (
                <span style={{ fontSize: 7, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)' }}>FT</span>
              )}
            </div>
            {/* Scores */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3 }}>
                <span style={{
                  fontSize: 14, fontWeight: 500, fontFamily: 'monospace',
                  color: isLiveG ? CS2_ACCENT : aWon ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.4)',
                }}>
                  {isPending ? '—' : (sA ?? '—')}
                </span>
                {!isPending && <SideBadge side={g.teamA?.side} />}
              </div>
              <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.25)' }}>
                {isFinishedG ? 'раунды' : '·'}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span style={{
                  fontSize: 14, fontWeight: 500, fontFamily: 'monospace',
                  color: isLiveG ? CS2_ACCENT : bWon ? 'rgb(var(--text-primary))' : 'rgba(var(--surface-tint-rgb),0.4)',
                }}>
                  {isPending ? '—' : (sB ?? '—')}
                </span>
                {!isPending && <SideBadge side={g.teamB?.side} />}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Hero: sticky header ──────────────────────────────────────────────────────

function Cs2Hero({ match, teamA, teamB, scoreA, scoreB, isLive, isFinished, gameSlug, isRefreshing, onBack }: {
  match: EsportsMatchDetail
  teamA?: EsportsTeamDetail; teamB?: EsportsTeamDetail
  scoreA: number | null; scoreB: number | null
  isLive: boolean; isFinished: boolean
  gameSlug: string; isRefreshing: boolean
  onBack: () => void
}) {
  const formatLabel = (() => {
    const f = (match.format ?? '').toLowerCase()
    const m = f.match(/bo\s*(\d+)/) ?? f.match(/best.?of.?(\d+)/)
    return m ? `BEST OF ${m[1]}` : match.format?.toUpperCase() ?? ''
  })()

  return (
    <div style={{
      background: 'rgb(var(--bg-surface))',
      borderBottom: '1px solid rgba(var(--surface-tint-rgb),0.08)',
    }}>
      {/* Row 1: Meta bar */}
      <div className="flex items-center justify-between px-4 py-1.5" style={{ minHeight: 32 }}>
        <div className="flex items-center gap-2">
          <button onClick={onBack}
            className="flex items-center gap-1 text-[9px] font-mono transition-colors hover:text-text-primary"
            style={{ color: 'rgb(var(--text-muted))' }}>
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <span className="text-[9px] font-mono truncate" style={{ color: 'rgb(var(--text-muted))' }}>
            {match.tournament ?? gameLabel(match.subcategory)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isRefreshing && (
            <svg className="w-3 h-3 animate-spin" style={{ color: 'rgb(var(--text-muted))' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          )}
          {formatLabel && (
            <span className="text-[8px] font-mono font-bold px-1.5 py-[2px] rounded"
              style={{ background: 'rgba(var(--watch),0.15)', color: 'rgb(var(--watch))' }}>
              {formatLabel}
            </span>
          )}
          {isLive && (
            <span className="inline-flex items-center gap-1 text-[8px] font-mono font-bold px-1.5 py-[2px] rounded"
              style={{ background: 'rgba(var(--danger),0.15)', color: 'rgb(var(--danger))' }}>
              <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: 'rgb(var(--danger))' }} />LIVE
            </span>
          )}
          {isFinished && (
            <span className="text-[8px] font-mono px-1.5 py-[2px] rounded border"
              style={{ borderColor: 'rgba(var(--surface-tint-rgb),0.15)', color: 'rgb(var(--text-muted))' }}>
              FIN
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Scoreboard */}
      <div className="flex items-center px-4 pb-3" style={{ minHeight: 80 }}>
        {/* Team A */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          {teamA && (
            teamA.id
              ? <Link href={`/cybersport/${gameSlug}/team/${teamA.id}`} prefetch={false}><TeamLogo team={teamA} size={44} circle /></Link>
              : <TeamLogo team={teamA} size={44} circle />
          )}
          <span className="text-[12px] font-mono text-center" style={{ color: 'rgb(var(--text-secondary))' }}>
            {teamA?.name ?? '—'}
          </span>
          {isFinished && scoreA != null && scoreA > (scoreB ?? 0) && (
            <span className="text-[8px] font-mono font-bold" style={{ color: 'rgb(var(--alpha))' }}>WON</span>
          )}
        </div>

        {/* Center: score */}
        <div className="flex flex-col items-center gap-0.5 w-24 shrink-0">
          <span className="text-[8px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--text-muted))' }}>СЕРИЯ</span>
          {(isLive || isFinished) && scoreA != null && scoreB != null ? (
            <span className="font-mono font-medium tabular-nums" style={{ fontSize: 30, color: 'rgb(var(--text-primary))' }}>
              {scoreA} : {scoreB}
            </span>
          ) : match.status === 'upcoming' ? (
            <>
              <span className="font-mono" style={{ fontSize: 20, color: 'rgba(var(--surface-tint-rgb),0.3)' }}>vs</span>
              <Countdown startsAt={match.startsAt} />
            </>
          ) : (
            <span className="font-mono" style={{ fontSize: 20, color: 'rgba(var(--surface-tint-rgb),0.3)' }}>vs</span>
          )}
        </div>

        {/* Team B */}
        <div className="flex-1 flex flex-col items-center gap-1.5">
          {teamB && (
            teamB.id
              ? <Link href={`/cybersport/${gameSlug}/team/${teamB.id}`} prefetch={false}><TeamLogo team={teamB} size={44} circle /></Link>
              : <TeamLogo team={teamB} size={44} circle />
          )}
          <span className="text-[12px] font-mono text-center" style={{ color: 'rgb(var(--text-secondary))' }}>
            {teamB?.name ?? '—'}
          </span>
          {isFinished && scoreB != null && scoreB > (scoreA ?? 0) && (
            <span className="text-[8px] font-mono font-bold" style={{ color: 'rgb(var(--alpha))' }}>WON</span>
          )}
        </div>
      </div>

      {/* Row 3: Maps bar */}
      {(match.games?.length ?? 0) > 0 && (
        <Cs2MapsBar games={match.games} teamAName={teamA?.name ?? '—'} teamBName={teamB?.name ?? '—'} />
      )}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Cs2Tab = 'overview' | 'maps' | 'players' | 'betting'
const TAB_LABELS: Record<Cs2Tab, string> = {
  overview: 'ОБЗОР',
  maps:     'КАРТЫ',
  players:  'ИГРОКИ',
  betting:  'БЕТТИНГ',
}

function Cs2TabBar({ active, onSelect }: { active: Cs2Tab; onSelect: (t: Cs2Tab) => void }) {
  return (
    <div className="flex border-b" style={{ borderColor: 'rgba(var(--surface-tint-rgb),0.08)', background: 'rgb(var(--bg-surface))' }}>
      {(Object.keys(TAB_LABELS) as Cs2Tab[]).map(tab => {
        const isActive = tab === active
        return (
          <button key={tab} onClick={() => onSelect(tab)}
            className="px-4 py-2.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors"
            style={{
              color: isActive ? CS2_ACCENT : 'rgb(var(--text-muted))',
              borderBottom: isActive ? `2px solid ${CS2_ACCENT}` : '2px solid transparent',
              marginBottom: -1,
            }}>
            {TAB_LABELS[tab]}
          </button>
        )
      })}
    </div>
  )
}

// ─── CS2 Section primitives ───────────────────────────────────────────────────

function Cs2SectionCard({ children, noPad }: { children: React.ReactNode; noPad?: boolean }) {
  return (
    <div style={{
      background: 'rgb(var(--bg-surface))',
      border: '1px solid rgba(var(--surface-tint-rgb),0.08)',
      borderRadius: 8,
      overflow: 'hidden',
      padding: noPad ? 0 : '10px 12px',
    }}>
      {children}
    </div>
  )
}

function Cs2SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(var(--surface-tint-rgb),0.4)' }}>
        {title}
      </span>
      {right && (
        <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)' }}>
          {right}
        </span>
      )}
    </div>
  )
}

// ─── CS2 Round bar ────────────────────────────────────────────────────────────

function Cs2RoundBar({ game, teamAName, teamBName }: {
  game: EsportsGame; teamAName: string; teamBName: string
}) {
  const rounds = game.rounds ?? []
  if (!rounds.length && !game.started) return null

  const isLiveG = game.started && !game.finished
  const currentRoundNum = isLiveG
    ? (rounds.find(r => r.started && !r.finished)?.round ?? null)
    : null

  // Build slots for MR12 (24 rounds standard), expand if OT rounds exist
  const maxRoundInData = rounds.reduce((m, r) => Math.max(m, r.round), 0)
  const totalSlots = Math.max(24, maxRoundInData)

  const slots: (EsportsRound | null)[] = Array.from({ length: totalSlots }, (_, i) =>
    rounds.find(r => r.round === i + 1) ?? null
  )

  const half1 = slots.slice(0, 12)
  const half2 = slots.slice(12, 24)
  const otSlots = totalSlots > 24 ? slots.slice(24) : []

  const anyHalf2Started = rounds.some(r => r.round > 12 && r.started)
  const sideASecond = rounds.find(r => r.round === 13)?.teamA?.side ?? null

  const aWins = rounds.filter(r => r.teamA?.won).length
  const bWins = rounds.filter(r => r.teamB?.won).length
  const mapLabel = `MAP ${game.seq}${game.map ? ` · ${game.map.toUpperCase()}` : ''}`

  const RoundSquare = ({ r, roundNum }: { r: EsportsRound | null; roundNum: number }) => {
    const isCurrent = roundNum === currentRoundNum
    const aWon = r?.teamA?.won === true
    const bWon = r?.teamB?.won === true
    const hasWinner = aWon || bWon

    if (isCurrent) {
      return (
        <div style={{
          width: 14, height: 14, borderRadius: 2, flexShrink: 0,
          background: CS2_ACCENT, border: `1px solid ${CS2_ACCENT}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 6, fontFamily: 'monospace', color: '#fff', fontWeight: 700 }}>{roundNum}</span>
        </div>
      )
    }
    if (hasWinner) {
      return (
        <div style={{
          width: 14, height: 14, borderRadius: 2, flexShrink: 0,
          background: aWon ? 'rgba(var(--alpha),0.18)' : 'rgba(var(--danger),0.18)',
          border: `1px solid ${aWon ? 'rgba(var(--alpha),0.35)' : 'rgba(var(--danger),0.35)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 6, fontFamily: 'monospace', fontWeight: 700, color: aWon ? 'rgb(var(--alpha))' : 'rgb(var(--danger))' }}>
            {aWon ? 'W' : 'L'}
          </span>
        </div>
      )
    }
    return (
      <div style={{
        width: 14, height: 14, borderRadius: 2, flexShrink: 0,
        background: 'rgba(var(--surface-tint-rgb),0.04)',
        border: '0.5px solid rgba(var(--surface-tint-rgb),0.1)',
      }} />
    )
  }

  return (
    <div>
      <Cs2SectionHeader
        title={`${mapLabel} · РАУНДЫ`}
        right={isLiveG && currentRoundNum != null ? `● R${currentRoundNum}` : game.finished ? `${aWins} : ${bWins}` : undefined}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        {half1.map((r, i) => <RoundSquare key={i + 1} r={r} roundNum={i + 1} />)}
        <div style={{ width: 1, height: 14, background: 'rgba(var(--surface-tint-rgb),0.15)', margin: '0 3px', flexShrink: 0 }} />
        {sideASecond && (
          <span style={{ fontSize: 7, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', lineHeight: '14px', marginRight: 3 }}>
            {sideASecond.toUpperCase().includes('CT') ? 'CT→' : sideASecond.toUpperCase().includes('T') ? 'T→' : '→'}
          </span>
        )}
        {anyHalf2Started
          ? half2.map((r, i) => <RoundSquare key={i + 13} r={r} roundNum={i + 13} />)
          : <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.2)', lineHeight: '14px' }}>half 2</span>
        }
        {otSlots.length > 0 && (
          <>
            <div style={{ width: 1, height: 14, background: 'rgba(var(--surface-tint-rgb),0.15)', margin: '0 3px', flexShrink: 0 }} />
            <span style={{ fontSize: 7, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', lineHeight: '14px', marginRight: 3 }}>OT</span>
            {otSlots.map((r, i) => <RoundSquare key={i + 25} r={r} roundNum={i + 25} />)}
          </>
        )}
      </div>
    </div>
  )
}

// ─── CS2 Economy bar ──────────────────────────────────────────────────────────

function Cs2EconomyBar({ game, teamAName, teamBName }: {
  game: EsportsGame; teamAName: string; teamBName: string
}) {
  const aLoad = game.teamA?.loadoutValue ?? 0
  const bLoad = game.teamB?.loadoutValue ?? 0
  if (aLoad === 0 && bLoad === 0) return null
  const total = aLoad + bLoad
  const aPct = total > 0 ? (aLoad / total) * 100 : 50
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`

  return (
    <div>
      <Cs2SectionHeader title="ЭКОНОМИКА" />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgb(var(--alpha))' }}>{teamAName}</span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.4)' }}>{teamBName}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 500, color: 'rgb(var(--poly))' }}>{fmt(aLoad)}</span>
        <div style={{ flex: 1, height: 5, borderRadius: 3, overflow: 'hidden', display: 'flex', background: 'rgba(var(--surface-tint-rgb),0.04)' }}>
          <div style={{ width: `${aPct}%`, height: '100%', background: 'rgb(var(--poly))', transition: 'width 0.5s' }} />
          <div style={{ width: `${100 - aPct}%`, height: '100%', background: 'rgb(var(--watch))', transition: 'width 0.5s' }} />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 500, color: 'rgb(var(--watch))' }}>{fmt(bLoad)}</span>
      </div>
    </div>
  )
}

// ─── CS2 Player grid (two-column) ─────────────────────────────────────────────

function Cs2PlayerGrid({ game, teamAName, teamBName }: {
  game: EsportsGame; teamAName: string; teamBName: string
}) {
  const gA = game.teamA
  const gB = game.teamB
  const hasA = (gA?.players?.length ?? 0) > 0
  const hasB = (gB?.players?.length ?? 0) > 0
  if (!hasA && !hasB) return null

  const sortedA = hasA ? [...gA!.players!].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0)) : []
  const sortedB = hasB ? [...gB!.players!].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0)) : []
  const maxKA = sortedA[0]?.kills ?? 0
  const maxKB = sortedB[0]?.kills ?? 0
  const sideALabel = sideLabel(gA?.side)
  const sideBLabel = sideLabel(gB?.side)

  const fmtMoney = (n?: number | null) => n == null ? '—' : n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`

  const PlayerRow2 = ({ p, maxK }: { p: EsportsPlayer; maxK: number }) => {
    const name = p.nickname ?? p.name ?? p.id
    const isTopK = (p.kills ?? 0) === maxK && maxK > 0
    const hp = p.currentHealth ?? null
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 4px' }}>
        {p.alive === false && (
          <span style={{ fontSize: 7, color: 'rgb(var(--danger))', flexShrink: 0, lineHeight: 1 }}>✕</span>
        )}
        <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'rgb(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: isTopK ? 700 : 400, color: isTopK ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))', width: 14, textAlign: 'right' }}>
          {p.kills ?? '—'}
        </span>
        <span style={{ fontSize: 8, color: 'rgba(var(--surface-tint-rgb),0.3)', fontFamily: 'monospace' }}>/</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgb(var(--text-muted))', width: 14, textAlign: 'right' }}>
          {p.deaths ?? '—'}
        </span>
        <span style={{ fontSize: 8, color: 'rgba(var(--surface-tint-rgb),0.3)', fontFamily: 'monospace' }}>/</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.45)', width: 14, textAlign: 'right' }}>
          {p.assists ?? '—'}
        </span>
        <div style={{ width: 24, height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(var(--surface-tint-rgb),0.08)', flexShrink: 0 }}>
          {hp != null && (
            <div style={{ width: `${Math.min(hp, 100)}%`, height: '100%', background: hp > 50 ? 'rgb(var(--alpha))' : 'rgb(var(--danger))' }} />
          )}
        </div>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.35)', width: 30, textAlign: 'right', flexShrink: 0 }}>
          {fmtMoney(p.money)}
        </span>
      </div>
    )
  }

  const TeamCol = ({ name, sLabel, isA, players, maxK }: {
    name: string; sLabel: string | null; isA: boolean; players: EsportsPlayer[]; maxK: number
  }) => (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '4px 4px 5px', borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.08)',
        marginBottom: 3,
      }}>
        <span style={{
          fontSize: 8, fontFamily: 'monospace', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: isA ? 'rgb(var(--alpha))' : 'rgb(var(--danger))',
        }}>
          {name}{sLabel ? ` · ${sLabel}` : ''}
        </span>
      </div>
      {players.map(p => <PlayerRow2 key={p.id} p={p} maxK={maxK} />)}
    </div>
  )

  return (
    <div>
      <Cs2SectionHeader title="ИГРОКИ" right="K · D · A · HP · $" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <TeamCol name={teamAName} sLabel={sideALabel} isA players={sortedA} maxK={maxKA} />
        <TeamCol name={teamBName} sLabel={sideBLabel} isA={false} players={sortedB} maxK={maxKB} />
      </div>
    </div>
  )
}

// ─── CS2 Veto block (collapsible) ─────────────────────────────────────────────

function Cs2VetoBlock({ actions, teamA, teamB, accent, format, defaultCollapsed }: {
  actions: EsportsDraftAction[]
  teamA: EsportsTeamDetail | null
  teamB: EsportsTeamDetail | null
  accent: string
  format?: string | null
  defaultCollapsed?: boolean
}) {
  const [open, setOpen] = useState(!defaultCollapsed)
  const maps = actions.filter(a => (a.itemType ?? '').toLowerCase() === 'map')
  if (!maps.length) return null
  const ordered = [...maps].sort((x, y) => Number(x.seq) - Number(y.seq))

  const f = (format ?? '').toLowerCase()
  const m = f.match(/bo\s*(\d+)/) ?? f.match(/best.?of.?(\d+)/)
  const formatLabel = m ? `BO${m[1]} · ${maps.length} шагов` : `${maps.length} шагов`

  // Two-column: odd indices (0,2,4,6) = team A steps; even (1,3,5) = team B steps
  const stepsA = ordered.filter((_, i) => i % 2 === 0)
  const stepsB = ordered.filter((_, i) => i % 2 === 1)

  const VetoRow = ({ a, stepIdx }: { a: EsportsDraftAction; stepIdx: number }) => {
    const isBan = a.type === 'ban'
    const isPick = a.type === 'pick'
    const isLeft = a.type === 'left' || a.type === 'remaining'
    const isTeamA = a.teamId === teamA?.id
    const isTeamB = a.teamId === teamB?.id
    const teamName = isTeamA ? teamA?.name : isTeamB ? teamB?.name : null
    const isActive = isPick
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 6px', borderRadius: 4,
        background: isActive ? `${CS2_ACCENT}0d` : 'transparent',
      }}>
        <span style={{ fontSize: 7, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', width: 14, flexShrink: 0 }}>
          {stepIdx}.
        </span>
        <span style={{
          fontSize: 8, fontFamily: 'monospace', fontWeight: 700, width: 24, flexShrink: 0,
          color: isBan ? 'rgb(var(--danger))' : isPick ? 'rgb(var(--alpha))' : 'rgb(var(--watch))',
        }}>
          {isBan ? 'BAN' : isPick ? 'PICK' : 'LEFT'}
        </span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgb(var(--text-primary))' }}>
          {a.heroName ?? '—'}{isActive ? ' ←' : ''}
        </span>
      </div>
    )
  }

  return (
    <Cs2SectionCard noPad>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '9px 12px', cursor: 'pointer', background: 'transparent', border: 0,
          borderBottom: open ? '0.5px solid rgba(var(--surface-tint-rgb),0.08)' : '0',
        }}
      >
        <span style={{ fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(var(--surface-tint-rgb),0.4)' }}>
          MAP VETO
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)' }}>{formatLabel}</span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.4)', transform: open ? 'rotate(180deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>↓</span>
        </div>
      </button>
      {open && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, padding: '6px 4px 8px' }}>
          <div>
            {stepsA.map((a, i) => <VetoRow key={a.seq} a={a} stepIdx={(i * 2) + 1} />)}
          </div>
          <div>
            {stepsB.map((a, i) => <VetoRow key={a.seq} a={a} stepIdx={(i * 2) + 2} />)}
          </div>
        </div>
      )}
    </Cs2SectionCard>
  )
}

// ─── Tab: ОБЗОР ───────────────────────────────────────────────────────────────

function OverviewTab({ match, teamA, teamB, accent, t }: {
  match: EsportsMatchDetail; teamA?: EsportsTeamDetail; teamB?: EsportsTeamDetail
  accent: string; t: ReturnType<typeof useT>
}) {
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'

  const liveGame = match.games?.find(g => g.started && !g.finished) ?? null
  const lastDone = [...(match.games ?? [])].reverse().find(g => g.finished) ?? null
  const focusGame = liveGame ?? lastDone

  const hasVeto = (match.draft ?? []).some(a => (a.itemType ?? '').toLowerCase() === 'map')

  if (!isLive && !isFinished) {
    return (
      <div className="flex flex-col gap-4">
        {match.preMatch && (() => {
          const pm = match.preMatch!
          const empty = !pm.tournament && !pm.streams?.length && !pm.recentA?.length && !pm.recentB?.length && !pm.h2h?.matches?.length
          if (empty) return (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <p className="text-[11px] font-mono" style={{ color: 'rgba(245,158,11,0.9)' }}>{t('esports.grid_dev_limit')}</p>
            </div>
          )
          return <PreMatchSection pre={pm} teamAName={teamA?.name ?? '—'} teamBName={teamB?.name ?? '—'} accent={accent} />
        })()}
        {hasVeto && (
          <Cs2VetoBlock actions={match.draft!} teamA={teamA ?? null} teamB={teamB ?? null} accent={accent} format={match.format} defaultCollapsed={false} />
        )}
        <WinProbBlock yesPrice={match.yesPrice} noPrice={match.noPrice} teamA={teamA?.name ?? '—'} teamB={teamB?.name ?? '—'} markets={match.markets} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Block 1: Round bar */}
      {focusGame && (focusGame.rounds?.length ?? 0) > 0 && teamA && teamB && (
        <Cs2SectionCard>
          <Cs2RoundBar game={focusGame} teamAName={teamA.name ?? '—'} teamBName={teamB.name ?? '—'} />
        </Cs2SectionCard>
      )}

      {/* Block 2: Economy */}
      {focusGame && ((focusGame.teamA?.loadoutValue ?? 0) > 0 || (focusGame.teamB?.loadoutValue ?? 0) > 0) && teamA && teamB && (
        <Cs2SectionCard>
          <Cs2EconomyBar game={focusGame} teamAName={teamA.name ?? '—'} teamBName={teamB.name ?? '—'} />
        </Cs2SectionCard>
      )}

      {/* Block 3: Players */}
      {focusGame && ((focusGame.teamA?.players?.length ?? 0) > 0 || (focusGame.teamB?.players?.length ?? 0) > 0) && teamA && teamB && (
        <Cs2SectionCard>
          <Cs2PlayerGrid game={focusGame} teamAName={teamA.name ?? '—'} teamBName={teamB.name ?? '—'} />
        </Cs2SectionCard>
      )}

      {/* Block 4: Minimap */}
      {focusGame && isLive && (() => {
        const hasPos = [...(focusGame.teamA?.players ?? []), ...(focusGame.teamB?.players ?? [])]
          .some(p => p.position && typeof p.position.x === 'number')
        return hasPos ? (
          <Cs2SectionCard noPad>
            <div style={{ padding: '9px 12px 0' }}>
              <Cs2SectionHeader title="МИНИКАРТА · ТЕКУЩИЙ РАУНД" />
            </div>
            <Cs2Minimap teamA={focusGame.teamA ?? null} teamB={focusGame.teamB ?? null} accent={accent} />
          </Cs2SectionCard>
        ) : null
      })()}

      {/* No game data */}
      {!focusGame && isLive && (
        <div className="bg-bg-surface border rounded-lg px-5 py-4 flex items-center gap-3"
          style={{ borderColor: `${CS2_ACCENT}33`, borderLeft: `3px solid ${CS2_ACCENT}` }}>
          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: CS2_ACCENT }} />
          <div>
            <p className="text-[11px] font-mono font-bold text-text-primary">Map 1 in progress</p>
            <p className="text-[10px] font-mono text-text-muted/60 mt-0.5">{t('esports.live_stats_soon')}</p>
          </div>
        </div>
      )}

      {/* Streams */}
      {isLive && (match.streams?.length ?? 0) > 0 && (
        <StreamPlayer urls={match.streams!} />
      )}

      {/* Block 5: MAP VETO — collapsed */}
      {hasVeto && (
        <Cs2VetoBlock actions={match.draft!} teamA={teamA ?? null} teamB={teamB ?? null} accent={accent} format={match.format} defaultCollapsed />
      )}

      <WinProbBlock yesPrice={match.yesPrice} noPrice={match.noPrice} teamA={teamA?.name ?? '—'} teamB={teamB?.name ?? '—'} markets={match.markets} />
    </div>
  )
}

// ─── Tab: КАРТЫ ───────────────────────────────────────────────────────────────

function MapsTab({ match, teamA, teamB, accent }: {
  match: EsportsMatchDetail; teamA?: EsportsTeamDetail; teamB?: EsportsTeamDetail; accent: string
}) {
  if (!match.games?.length) {
    return <p className="text-[11px] font-mono text-text-muted text-center py-8">Нет данных по картам</p>
  }
  const tAName = teamA?.name ?? '—'
  const tBName = teamB?.name ?? '—'

  return (
    <div className="flex flex-col gap-4">
      {match.games.map(g => {
        const isLiveG = g.started && !g.finished
        const isFinishedG = g.finished
        const isPending = !g.started && !g.finished
        const aWon = g.teamA?.won
        const bWon = g.teamB?.won
        const mapLabel = `MAP ${g.seq}${g.map ? ` · ${g.map.toUpperCase()}` : ''}`
        const currentRound = isLiveG && g.rounds ? g.rounds.filter(r => r.started).length : null
        const borderColor = isLiveG ? CS2_ACCENT
          : isFinishedG ? (aWon ? 'rgba(var(--alpha),0.4)' : bWon ? 'rgba(var(--danger),0.4)' : 'rgba(var(--surface-tint-rgb),0.08)')
          : 'rgba(var(--surface-tint-rgb),0.08)'

        return (
          <div key={g.seq} style={{
            background: 'rgb(var(--bg-surface))',
            border: `1px solid ${borderColor}`,
            borderRadius: 8, overflow: 'hidden',
            opacity: isPending ? 0.65 : 1,
          }}>
            {/* Map header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.08)' }}>
              <span style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: isLiveG ? CS2_ACCENT : 'rgb(var(--text-secondary))' }}>
                {mapLabel}
              </span>
              {isLiveG && (
                <span style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 700, color: CS2_ACCENT }}>
                  ● LIVE{currentRound != null ? ` · R${currentRound}` : ''}
                </span>
              )}
              {isFinishedG && (
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.35)' }}>FT</span>
              )}
              {isPending && (
                <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)' }}>PENDING</span>
              )}
            </div>

            {isPending ? (
              <p style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', textAlign: 'center', padding: '20px 12px' }}>
                Матч ещё не начался
              </p>
            ) : (
              <div className="flex flex-col gap-0" style={{ padding: '10px 12px', gap: 12 }}>
                {/* Round bar */}
                {(g.rounds?.length ?? 0) > 0 && (
                  <Cs2RoundBar game={g} teamAName={tAName} teamBName={tBName} />
                )}
                {/* Economy */}
                {((g.teamA?.loadoutValue ?? 0) > 0 || (g.teamB?.loadoutValue ?? 0) > 0) && (
                  <Cs2EconomyBar game={g} teamAName={tAName} teamBName={tBName} />
                )}
                {/* Players */}
                {((g.teamA?.players?.length ?? 0) > 0 || (g.teamB?.players?.length ?? 0) > 0) && (
                  <Cs2PlayerGrid game={g} teamAName={tAName} teamBName={tBName} />
                )}
                {/* Minimap */}
                {isLiveG && (() => {
                  const hasPos = [...(g.teamA?.players ?? []), ...(g.teamB?.players ?? [])]
                    .some(p => p.position && typeof p.position.x === 'number')
                  return hasPos ? <Cs2Minimap teamA={g.teamA ?? null} teamB={g.teamB ?? null} accent={accent} /> : null
                })()}
                {/* Final score */}
                {isFinishedG && g.teamA?.score != null && g.teamB?.score != null && (
                  <div style={{ textAlign: 'center', padding: '4px 0 2px' }}>
                    <span style={{ fontSize: 22, fontFamily: 'monospace', fontWeight: 500, color: 'rgb(var(--text-primary))' }}>
                      {g.teamA.score} : {g.teamB.score}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab: ИГРОКИ ──────────────────────────────────────────────────────────────

function aggregatePlayers(games: EsportsGame[], side: 'A' | 'B'): EsportsPlayer[] {
  const acc = new Map<string, EsportsPlayer>()
  for (const g of games) {
    if (!g.started) continue
    const players = side === 'A' ? g.teamA?.players : g.teamB?.players
    for (const p of players ?? []) {
      if (!acc.has(p.id)) {
        acc.set(p.id, { ...p })
      } else {
        const e = acc.get(p.id)!
        acc.set(p.id, {
          ...e,
          kills: e.kills + p.kills,
          deaths: e.deaths + p.deaths,
          assists: e.assists + p.assists,
          headshots: (e.headshots ?? 0) + (p.headshots ?? 0),
          damageDealt: (e.damageDealt ?? 0) + (p.damageDealt ?? 0),
        })
      }
    }
  }
  return Array.from(acc.values())
}

function PlayersTab({ match, teamA, teamB, accent }: {
  match: EsportsMatchDetail; teamA?: EsportsTeamDetail; teamB?: EsportsTeamDetail; accent: string
}) {
  const completedRounds = match.games.reduce((n, g) => n + (g.rounds?.filter(r => r.finished).length ?? 0), 0)
  const playersA = aggregatePlayers(match.games ?? [], 'A')
  const playersB = aggregatePlayers(match.games ?? [], 'B')

  if (!playersA.length && !playersB.length) {
    return <p className="text-[11px] font-mono text-text-muted text-center py-8">Нет данных об игроках</p>
  }

  const sortedA = [...playersA].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))
  const sortedB = [...playersB].sort((a, b) => (b.kills ?? 0) - (a.kills ?? 0))
  const maxKA = sortedA[0]?.kills ?? 0
  const maxKB = sortedB[0]?.kills ?? 0
  const fmtMoney = (n?: number | null) => n == null ? '—' : n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`

  const AggRow = ({ p, maxK }: { p: EsportsPlayer; maxK: number }) => {
    const name = p.nickname ?? p.name ?? p.id
    const isTopK = (p.kills ?? 0) === maxK && maxK > 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px' }}>
        <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'rgb(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', fontWeight: isTopK ? 700 : 400, color: isTopK ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))', width: 16, textAlign: 'right' }}>
          {p.kills ?? '—'}
        </span>
        <span style={{ fontSize: 8, color: 'rgba(var(--surface-tint-rgb),0.3)', fontFamily: 'monospace' }}>/</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgb(var(--text-muted))', width: 16, textAlign: 'right' }}>{p.deaths ?? '—'}</span>
        <span style={{ fontSize: 8, color: 'rgba(var(--surface-tint-rgb),0.3)', fontFamily: 'monospace' }}>/</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.45)', width: 16, textAlign: 'right' }}>{p.assists ?? '—'}</span>
        <div style={{ width: 24, height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(var(--surface-tint-rgb),0.08)', flexShrink: 0 }}>
          {p.currentHealth != null && (
            <div style={{ width: `${Math.min(p.currentHealth, 100)}%`, height: '100%', background: (p.currentHealth ?? 0) > 50 ? 'rgb(var(--alpha))' : 'rgb(var(--danger))' }} />
          )}
        </div>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.35)', width: 30, textAlign: 'right', flexShrink: 0 }}>
          {fmtMoney(p.money)}
        </span>
      </div>
    )
  }

  const colHeader = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px 4px' }}>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', width: 16, textAlign: 'right' }}>K</span>
      <span style={{ width: 4 }} />
      <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', width: 16, textAlign: 'right' }}>D</span>
      <span style={{ width: 4 }} />
      <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', width: 16, textAlign: 'right' }}>A</span>
      <div style={{ width: 24, flexShrink: 0 }}><span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)' }}>HP</span></div>
      <span style={{ fontSize: 8, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', width: 30, textAlign: 'right', flexShrink: 0 }}>$</span>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <div style={{ background: 'rgb(var(--bg-surface))', border: '1px solid rgba(var(--surface-tint-rgb),0.08)', borderRadius: 8, overflow: 'hidden' }}>
        {colHeader}
        {sortedA.length > 0 && (
          <div>
            <div style={{ padding: '5px 10px 4px', borderTop: '0.5px solid rgba(var(--surface-tint-rgb),0.08)', borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.05)' }}>
              <span style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgb(var(--alpha))' }}>
                {teamA?.name ?? 'Team A'}
              </span>
            </div>
            {sortedA.map(p => <AggRow key={p.id} p={p} maxK={maxKA} />)}
          </div>
        )}
        {sortedA.length > 0 && sortedB.length > 0 && (
          <div style={{ height: 0.5, background: 'rgba(var(--surface-tint-rgb),0.08)', margin: '6px 0' }} />
        )}
        {sortedB.length > 0 && (
          <div>
            <div style={{ padding: '5px 10px 4px', borderTop: '0.5px solid rgba(var(--surface-tint-rgb),0.08)', borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.05)' }}>
              <span style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgb(var(--danger))' }}>
                {teamB?.name ?? 'Team B'}
              </span>
            </div>
            {sortedB.map(p => <AggRow key={p.id} p={p} maxK={maxKB} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab: БЕТТИНГ ─────────────────────────────────────────────────────────────

function BettingTab({ match, teamA, teamB }: {
  match: EsportsMatchDetail; teamA?: EsportsTeamDetail; teamB?: EsportsTeamDetail
}) {
  const markets = match.markets ?? []
  const hasProb = match.yesPrice != null && match.yesPrice !== 0.5 && match.yesPrice > 0

  if (!markets.length && !hasProb) {
    return <p className="text-[11px] font-mono text-text-muted text-center py-8">Нет рынков</p>
  }

  // Group markets by type/mapNumber
  const seriesMarkets  = markets.filter(m => !m.mapNumber)
  const mapMarketsMap = new Map<number, typeof markets>()
  for (const m of markets.filter(m => m.mapNumber)) {
    const n = m.mapNumber!
    if (!mapMarketsMap.has(n)) mapMarketsMap.set(n, [])
    mapMarketsMap.get(n)!.push(m)
  }

  const MarketRow = ({ m }: { m: import('../types').EsportsMarket }) => {
    const pct = Math.round(m.yesPrice * 100)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.06)' }}>
        <span style={{ flex: 1, fontSize: 11, fontFamily: 'monospace', color: 'rgb(var(--text-secondary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {m.question ?? m.type}
        </span>
        <div style={{ width: 60, height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(var(--surface-tint-rgb),0.08)', flexShrink: 0 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: 'rgb(var(--alpha))' }} />
        </div>
        <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 500, color: 'rgb(var(--alpha))', width: 32, textAlign: 'right', flexShrink: 0 }}>
          {pct}%
        </span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: 'rgba(var(--surface-tint-rgb),0.3)', flexShrink: 0 }}>→</span>
      </div>
    )
  }

  const GroupHeader = ({ label }: { label: string }) => (
    <div style={{ padding: '8px 10px 4px', borderBottom: '0.5px solid rgba(var(--surface-tint-rgb),0.08)' }}>
      <span style={{ fontSize: 8, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(var(--surface-tint-rgb),0.4)' }}>
        {label}
      </span>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      {hasProb && (
        <WinProbBlock
          yesPrice={match.yesPrice} noPrice={match.noPrice}
          teamA={teamA?.name ?? '—'} teamB={teamB?.name ?? '—'}
        />
      )}

      {markets.length > 0 && (
        <div style={{ background: 'rgb(var(--bg-surface))', border: '1px solid rgba(var(--surface-tint-rgb),0.08)', borderRadius: 8, overflow: 'hidden' }}>
          {seriesMarkets.length > 0 && (
            <>
              <GroupHeader label="ПОБЕДИТЕЛЬ СЕРИИ" />
              {seriesMarkets.map(m => <MarketRow key={m.id} m={m} />)}
            </>
          )}
          {Array.from(mapMarketsMap.entries()).sort(([a], [b]) => a - b).map(([n, ms]) => {
            const mapName = match.games?.find(g => g.seq === n)?.map
            const label = mapName ? `ПОБЕДИТЕЛЬ КАРТЫ ${n} · ${mapName.toUpperCase()}` : `ПОБЕДИТЕЛЬ КАРТЫ ${n}`
            return (
              <div key={n}>
                <GroupHeader label={label} />
                {ms.map(m => <MarketRow key={m.id} m={m} />)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function CS2MatchScreen({ seriesId, initialData }: { seriesId: string; initialData?: EsportsMatchDetail }) {
  const router = useRouter()

  const fetcher = useCallback(() => api.getEsportsMatch(seriesId), [seriesId])
  const { data, loading, isRefreshing } = usePolling<EsportsMatchDetail>(
    fetcher,
    d => d?.status === 'finished' ? null
       : d?.status === 'live'     ? 10_000
       :                            60_000,
    seriesId,
    ...(initialData ? [{ initialData }] : []),
  )
  const match = data ?? null

  const titleTeams = match ? `${match.teamA?.name ?? '?'} vs ${match.teamB?.name ?? '?'}` : null
  usePageTitle(titleTeams ? `${titleTeams} — Esports` : 'Match')

  const { lang } = useLang()
  const t = useT(lang)

  const [activeTab, setActiveTab] = useState<Cs2Tab>('overview')

  const isLive     = match?.status === 'live'
  const isFinished = match?.status === 'finished'

  const teamA = match?.teamA as EsportsTeamDetail | undefined
  const teamB = match?.teamB as EsportsTeamDetail | undefined
  const scoreA = teamA?.score ?? null
  const scoreB = teamB?.score ?? null

  const accent    = teamA?.colorPrimary ?? nameToColor(teamA?.name ?? '')
  const gameSlug  = (match?.subcategory ?? '').includes('valorant') ? 'valorant' : 'cs2'

  const handleBack = useCallback(() => {
    window.history.length > 1 ? router.back() : router.push(`/cybersport/${gameSlug}`)
  }, [router, gameSlug])

  // ─── Skeleton ────────────────────────────────────────────────────────────────
  if (loading && !match) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">
        <div className="h-5 w-20 rounded animate-pulse bg-bg-surface" />
        <div className="h-36 rounded-lg animate-pulse bg-bg-surface border border-bg-border" />
        {[0,1,2].map(i => (
          <div key={i} className="h-20 rounded-lg animate-pulse bg-bg-surface border border-bg-border"
            style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    )
  }

  if (!match) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20 text-center flex flex-col items-center gap-3">
        <p className="text-sm font-mono text-text-muted">Match not found</p>
        <Link href="/cybersport/cs2"
          className="text-[11px] font-mono text-text-muted/70 hover:text-text-primary underline underline-offset-2">
          ← Back to esports
        </Link>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="w-full max-w-3xl mx-auto">

        {/* Sticky: hero + tabs */}
        <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
          <Cs2Hero
            match={match}
            teamA={teamA} teamB={teamB}
            scoreA={scoreA} scoreB={scoreB}
            isLive={!!isLive} isFinished={!!isFinished}
            gameSlug={gameSlug}
            isRefreshing={isRefreshing}
            onBack={handleBack}
          />
          <Cs2TabBar active={activeTab} onSelect={setActiveTab} />
        </div>

        {/* Tab content */}
        <div className="px-4 sm:px-6 py-4 flex flex-col gap-4">
          {activeTab === 'overview' && (
            <OverviewTab match={match} teamA={teamA} teamB={teamB} accent={accent} t={t} />
          )}
          {activeTab === 'maps' && (
            <MapsTab match={match} teamA={teamA} teamB={teamB} accent={accent} />
          )}
          {activeTab === 'players' && (
            <PlayersTab match={match} teamA={teamA} teamB={teamB} accent={accent} />
          )}
          {activeTab === 'betting' && (
            <BettingTab match={match} teamA={teamA} teamB={teamB} />
          )}
        </div>

      </div>
    </ErrorBoundary>
  )
}
