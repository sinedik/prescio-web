'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePolling } from '../hooks/usePolling'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import { ErrorBoundary } from '../components/ErrorBoundary'
import MarketsPanel from '../components/esports/MarketsPanel'
import type { EsportsMatchDetail, EsportsGame, EsportsGameTeam, EsportsDraftAction, EsportsPlayer, EsportsTeamDetail, EsportsRound, EsportsDotaLive, EsportsDotaPlayer, EsportsPreMatch, EsportsRecentMatch } from '../types'

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

// Hero portrait from Steam CDN — works for any Dota2 hero
function heroIconUrl(heroId?: string | null, heroName?: string | null): string | null {
  if (heroId) {
    const m = heroId.match(/^npc_dota_hero_(.+)$/)
    if (m) return `https://cdn.dota2.com/apps/dota2/images/dota_react/heroes/${m[1]}.png`
  }
  if (heroName) {
    const slug = heroName.toLowerCase().replace(/[\s'-]+/g, '_').replace(/[^a-z0-9_]/g, '')
    return `https://cdn.dota2.com/apps/dota2/images/dota_react/heroes/${slug}.png`
  }
  return null
}

function HeroPortrait({ heroId, heroName, heroImg, size = 28, isBan = false, sideColor }: {
  heroId?: string | null; heroName?: string | null; heroImg?: string | null; size?: number; isBan?: boolean; sideColor?: string
}) {
  const [err, setErr] = useState(false)
  const url = heroImg ?? heroIconUrl(heroId, heroName)
  if (url && !err) {
    return (
      <div className="relative shrink-0 rounded overflow-hidden" style={{
        width: size,
        height: size * 0.56,
        boxShadow: sideColor ? `inset 0 -2px 0 ${sideColor}` : undefined,
      }}>
        <img src={url} alt={heroName ?? ''} onError={() => setErr(true)}
          className="w-full h-full object-cover object-top"
          style={isBan ? { filter: 'grayscale(80%) brightness(0.5)' } : undefined} />
        {isBan && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-red-400/80 text-[9px] font-bold">✕</span>
          </div>
        )}
      </div>
    )
  }
  return null
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

function TeamLogo({ team, size = 40 }: { team: EsportsTeamDetail; size?: number }) {
  const [err, setErr] = useState(false)
  const color = team.colorPrimary ?? nameToColor(team.name ?? '?')
  const initials = (team.name ?? '?').slice(0, 2).toUpperCase()
  if (team.logoUrl && !err) {
    return (
      <img
        src={team.logoUrl}
        alt={team.name}
        width={size}
        height={size}
        onError={() => setErr(true)}
        className="object-contain rounded"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded flex items-center justify-center font-mono font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}
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
    <div className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/[0.02] transition-colors">
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

// ─── Draft picks/bans row ─────────────────────────────────────────────────────

function DraftRow({ actions, teamAId, teamBId, accent }: {
  actions: EsportsDraftAction[]
  teamAId?: string
  teamBId?: string
  accent: string
}) {
  if (!actions.length) return null
  const picks = actions.filter(a => a.type === 'pick')
  const bans  = actions.filter(a => a.type === 'ban')
  return (
    <div className="flex flex-col gap-2">
      {picks.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {picks.map((a, i) => {
            const isA = a.teamId === teamAId
            const isB = a.teamId === teamBId
            const portrait = <HeroPortrait heroId={a.heroId} heroName={a.heroName} heroImg={a.heroImg} size={36} />
            return (
              <div key={i} className="flex flex-col items-center gap-0.5 group" title={a.heroName ?? undefined}>
                {portrait ? (
                  <div className="rounded overflow-hidden" style={{
                    border: `1px solid ${isA ? `${accent}55` : 'rgba(255,255,255,0.12)'}`,
                    boxShadow: isA ? `0 0 6px ${accent}22` : undefined,
                  }}>
                    {portrait}
                  </div>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{
                      background: isA ? `${accent}18` : isB ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                      color: isA ? accent : 'rgb(var(--text-secondary))',
                      border: `1px solid ${isA ? `${accent}33` : 'rgba(255,255,255,0.08)'}`,
                    }}>
                    {a.heroName ?? `pick#${i + 1}`}
                  </span>
                )}
                {portrait && a.heroName && (
                  <span className="text-[8px] font-mono text-text-muted/50 max-w-[36px] truncate text-center"
                    style={{ color: isA ? `${accent}cc` : undefined }}>
                    {a.heroName.split(' ')[0]}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
      {bans.length > 0 && (
        <div className="flex items-center flex-wrap gap-1.5">
          <span className="text-[8px] font-mono text-text-muted/40 uppercase tracking-wider self-center mr-0.5">Ban</span>
          {bans.map((a, i) => {
            const portrait = <HeroPortrait heroId={a.heroId} heroName={a.heroName} heroImg={a.heroImg} size={28} isBan />
            return (
              <div key={i} title={a.heroName ?? undefined} className="opacity-60">
                {portrait ? (
                  <div className="rounded overflow-hidden border border-red-900/30">{portrait}</div>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded line-through opacity-50"
                    style={{ background: 'rgba(255,50,50,0.06)', color: '#ff5252', border: '1px solid rgba(255,50,50,0.15)' }}>
                    {a.heroName ?? `ban#${i + 1}`}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
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
          Нажмите на карту, чтобы открыть →
        </span>
      </div>

      {/* Intermission banner */}
      {inIntermission && (
        <div className="rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2 flex items-center gap-2">
          <span className="text-[9px] font-mono font-bold px-1.5 py-[1px] rounded uppercase tracking-wider"
            style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
            Перерыв
          </span>
          <span className="text-[10px] font-mono text-text-muted">
            {isDota ? `Game ${lastFinishedSeq}` : `Map ${lastFinishedSeq}`} завершена · ждём {isDota ? `Game ${nextUpSeq}` : `Map ${nextUpSeq}`}
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
              title={gFin ? 'Смотреть карту' : gLive ? 'Идёт сейчас' : 'Карта ещё не начата'}
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
                    <span className="text-text-muted/30">:</span>
                    <span className={bWon ? 'font-bold' : 'text-text-muted/60'} style={bWon ? { color: accent } : undefined}>
                      {gB?.score}
                    </span>
                  </>
                ) : gLive ? (
                  <span className="text-text-muted/50">in progress</span>
                ) : gUpcoming ? (
                  <span className="text-text-muted/30">not started</span>
                ) : (
                  <span className="text-text-muted/30">—</span>
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
                Просмотр: {selLabel}
              </span>
              {selFin && <span className="text-[9px] font-mono text-text-muted/50">— завершена</span>}
              {selLive && <span className="text-[9px] font-mono text-text-muted/70">— в прямом эфире</span>}
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
                <span className="text-text-muted/30 text-sm">:</span>
                <span className={`text-base font-bold ${gB?.won ? '' : 'text-text-muted'}`}
                  style={{ color: gB?.won ? colorB : undefined }}>{gB.score}</span>
              </>
            ) : isLive ? (
              <span className="text-[9px] font-mono animate-pulse px-1.5 py-0.5 rounded"
                style={{ background: `${LIVE_RED}1f`, color: LIVE_RED }}>LIVE</span>
            ) : (
              <span className="text-text-muted/30 text-sm">—</span>
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

      {/* Draft picks/bans */}
      {hasDraft && isDota && (
        <div className="px-4 pb-2 pt-0">
          <DraftRow actions={game.draft!} teamAId={gA?.id} teamBId={gB?.id} accent={accent} />
        </div>
      )}

      {/* Player scoreboards */}
      {hasPlayers && (() => {
        const completedRounds = game.rounds?.filter(r => r.finished).length ?? 0
        return (
        <div className="border-t border-bg-border/50 px-2 pb-2 pt-1">
          {/* Column headers */}
          <div className="flex items-center gap-2 px-2 pb-1">
            <span className="flex-1 text-[9px] font-mono text-text-muted/40 uppercase tracking-wider">Player</span>
            <span className="text-[9px] font-mono text-text-muted/40 w-6 text-center">K</span>
            <span className="text-[10px] font-mono text-text-muted/20">/</span>
            <span className="text-[9px] font-mono text-text-muted/40 w-6 text-center">D</span>
            <span className="text-[10px] font-mono text-text-muted/20">/</span>
            <span className="text-[9px] font-mono text-text-muted/40 w-6 text-center">A</span>
            {isDota && <span className="text-[9px] font-mono text-text-muted/40 w-12 text-right">NW</span>}
            {isCs2 && <span className="text-[9px] font-mono text-yellow-500/40 w-8 text-right">HS</span>}
            {isCs2 && completedRounds > 0 && <span className="text-[9px] font-mono text-text-muted/40 w-10 text-right" title={`ADR = damage / ${completedRounds} rounds`}>ADR</span>}
            {isCs2 && <span className="text-[9px] font-mono text-text-muted/30 w-14 text-right">DMG</span>}
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

    </div>
  )
}


// ─── Dota 2 win rate sparkline ────────────────────────────────────────────────

function WinRateSparkline({ winRates, accent, teamAName, teamBName }: {
  winRates: { time: number; winRate: number }[]
  accent: string
  teamAName: string
  teamBName: string
}) {
  if (winRates.length < 2) return null
  const W = 300, H = 48
  const times = winRates.map(w => w.time)
  const minT = Math.min(...times), maxT = Math.max(...times)
  const rangeT = maxT - minT || 1

  const pts = winRates.map(w => {
    const x = ((w.time - minT) / rangeT) * W
    const y = H - w.winRate * H
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const pathD = `M ${pts.join(' L ')}`
  const last = winRates[winRates.length - 1]
  const lastX = ((last.time - minT) / rangeT) * W
  const lastY = H - last.winRate * H
  const pct = Math.round(last.winRate * 100)

  return (
    <div className="bg-bg-elevated/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[9px] font-mono text-text-muted/40 uppercase tracking-wider">Win probability over time</span>
        <span className="text-[11px] font-mono font-bold" style={{ color: pct >= 50 ? accent : '#888' }}>{pct}%</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-12" preserveAspectRatio="none">
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="4 4" />
        <path d={`${pathD} L ${lastX.toFixed(1)},${H} L 0,${H} Z`} fill={`${accent}22`} />
        <path d={pathD} fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX.toFixed(1)} cy={lastY.toFixed(1)} r="3" fill={accent} />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[8px] font-mono text-text-muted/40">{teamAName}</span>
        <span className="text-[8px] font-mono text-text-muted/40">{teamBName}</span>
      </div>
    </div>
  )
}

// ─── Dota 2 game timeline (kills, roshan, buildings) ─────────────────────────

function SeriesTimeline({ live, teamAName, teamBName, accent }: {
  live: EsportsDotaLive
  teamAName: string
  teamBName: string
  accent: string
}) {
  const kills = live.killTimeline ?? []
  const rosh  = (live.roshanEvents ?? []).filter(r => !r.isAlive) // deaths only
  const bld   = (live.buildingEvents ?? []).filter(b => b.isAlive === false)

  const hasAny = kills.length > 0 || rosh.length > 0 || bld.length > 0
  if (!hasAny) return null

  const allTimes = [
    ...kills.map(k => k.time),
    ...rosh.map(r => r.time),
    ...bld.map(b => b.time),
  ]
  const minT = Math.min(0, ...allTimes)
  const maxT = Math.max(live.gameTime ?? 0, ...allTimes, 60)
  const range = maxT - minT || 1
  const W = 600, H = 64
  const pct = (t: number) => ((t - minT) / range) * 100

  return (
    <div className="bg-bg-elevated/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono text-text-muted/40 uppercase tracking-wider">Timeline</span>
        <span className="text-[8px] font-mono text-text-muted/40">
          {kills.length}k · {rosh.length} rosh · {bld.length} bld
        </span>
      </div>
      <div className="relative overflow-hidden" style={{ width: '100%', height: H }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
          {/* Axis */}
          <line x1={0} y1={H/2} x2={W} y2={H/2} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          {/* Minute ticks */}
          {Array.from({ length: Math.floor(maxT/60) + 1 }, (_, m) => {
            const x = pct(m * 60) * W / 100
            return (
              <g key={m}>
                <line x1={x} y1={H/2 - 3} x2={x} y2={H/2 + 3} stroke="rgba(255,255,255,0.15)" />
                {m % 5 === 0 && (
                  <text x={x} y={H - 2} fontSize={7} fill="rgba(255,255,255,0.3)" textAnchor="middle" fontFamily="monospace">
                    {m}m
                  </text>
                )}
              </g>
            )
          })}
          {/* Kills */}
          {kills.map((k, i) => {
            const x = pct(k.time) * W / 100
            const y = k.isRadiant ? H/2 - 8 : H/2 + 8
            const col = k.isRadiant ? DOTA_RADIANT : DOTA_DIRE
            return <circle key={`k${i}`} cx={x} cy={y} r={1.8} fill={col} opacity={0.8} />
          })}
          {/* Roshan */}
          {rosh.map((r, i) => {
            const x = pct(r.time) * W / 100
            return (
              <g key={`r${i}`}>
                <line x1={x} y1={4} x2={x} y2={H-12} stroke="#ffd84a" strokeWidth={1} strokeDasharray="2 2" opacity={0.5} />
                <text x={x} y={10} fontSize={8} fill="#ffd84a" textAnchor="middle" fontFamily="monospace">R</text>
              </g>
            )
          })}
          {/* Buildings */}
          {bld.map((b, i) => {
            const x = pct(b.time) * W / 100
            const col = b.isRadiant ? DOTA_DIRE : DOTA_RADIANT // dead radiant building → kill credit dire color
            return <rect key={`b${i}`} x={x - 1} y={H/2 - 2} width={2} height={4} fill={col} opacity={0.7} />
          })}
        </svg>
      </div>
      <div className="flex justify-between text-[8px] font-mono mt-1">
        <span style={{ color: DOTA_RADIANT }}>{teamAName}</span>
        <span className="text-text-muted/40">R · building · K/min</span>
        <span style={{ color: DOTA_DIRE }}>{teamBName}</span>
      </div>
    </div>
  )
}

// ─── Dota 2 live section ──────────────────────────────────────────────────────

function DotaLiveSection({ live, teamAName, teamBName, accent }: {
  live: EsportsDotaLive
  teamAName: string
  teamBName: string
  accent: string
}) {
  const radiantPlayers = live.players?.filter(p => p.isRadiant) ?? []
  const direPlayers    = live.players?.filter(p => !p.isRadiant) ?? []

  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-bg-border/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Dota 2 Live</span>
          {live.gameTime != null && live.gameTime >= 0 && (() => {
            const cycle = live.gameTime % 600
            const isDay = cycle < 300
            return (
              <span className="text-[9px] font-mono px-1.5 py-[1px] rounded" title={isDay ? 'Day' : 'Night (Roshan safer to take)'}
                style={{
                  background: isDay ? 'rgba(253,224,71,0.12)' : 'rgba(99,102,241,0.15)',
                  color: isDay ? '#facc15' : '#a5b4fc',
                  border: `1px solid ${isDay ? 'rgba(253,224,71,0.25)' : 'rgba(99,102,241,0.28)'}`,
                }}>
                {isDay ? '☀ Day' : '☾ Night'}
              </span>
            )
          })()}
        </div>
        <div className="flex items-center gap-3">
          {live.gameTime != null && (
            <span className="text-[11px] font-mono font-bold text-text-primary tabular-nums">
              {live.gameTime < 0 ? `-${fmtClock(Math.abs(live.gameTime))}` : fmtClock(live.gameTime)}
            </span>
          )}
          {live.spectators != null && (
            <span className="text-[9px] font-mono text-text-muted/50">{live.spectators.toLocaleString()} watching</span>
          )}
        </div>
      </div>

      {/* Kill score */}
      {(live.radiantScore != null || live.direScore != null) && (
        <div className="px-4 py-2 flex items-center justify-between bg-bg-elevated/30">
          <span className="text-[11px] font-mono font-bold truncate flex-1" style={{ color: DOTA_RADIANT }}>{teamAName}</span>
          <div className="flex items-center gap-2 font-mono shrink-0">
            <span className="text-xl font-bold" style={{ color: DOTA_RADIANT }}>{live.radiantScore ?? 0}</span>
            <span className="text-text-muted/40">:</span>
            <span className="text-xl font-bold" style={{ color: DOTA_DIRE }}>{live.direScore ?? 0}</span>
          </div>
          <span className="text-[11px] font-mono font-bold truncate flex-1 text-right" style={{ color: DOTA_DIRE }}>{teamBName}</span>
        </div>
      )}

      {/* Net worth lead */}
      {(() => {
        const radNW = radiantPlayers.reduce((s, p) => s + (p.networth ?? 0), 0)
        const direNW = direPlayers.reduce((s, p) => s + (p.networth ?? 0), 0)
        if (radNW === 0 && direNW === 0) return null
        const lead = live.radiantLead ?? (radNW - direNW)
        const total = radNW + direNW
        const radPct = total > 0 ? (radNW / total) * 100 : 50
        const absK = Math.abs(lead) >= 1000 ? `${(Math.abs(lead) / 1000).toFixed(1)}k` : String(Math.abs(lead))
        const leader = lead > 0 ? 'Radiant' : lead < 0 ? 'Dire' : null
        const leaderCol = lead > 0 ? DOTA_RADIANT : lead < 0 ? DOTA_DIRE : '#6b7280'
        return (
          <div className="px-4 py-2 border-b border-bg-border/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider">Net worth</span>
              {leader ? (
                <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color: leaderCol }}>
                  {leader} +{absK}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-text-muted/50">even</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tabular-nums shrink-0 w-12" style={{ color: DOTA_RADIANT }}>
                {fmtK(radNW)}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden flex" style={{ background: 'rgba(255,255,255,0.04)' }}>
                <div className="h-full transition-all duration-500" style={{ width: `${radPct}%`, background: DOTA_RADIANT }} />
                <div className="h-full transition-all duration-500" style={{ width: `${100 - radPct}%`, background: DOTA_DIRE }} />
              </div>
              <span className="text-[10px] font-mono tabular-nums shrink-0 w-12 text-right" style={{ color: DOTA_DIRE }}>
                {fmtK(direNW)}
              </span>
            </div>
          </div>
        )
      })()}

      <div className="px-4 pb-4 pt-3 flex flex-col gap-3">
        {/* Win rate sparkline */}
        {live.winRates && live.winRates.length > 1 && (
          <WinRateSparkline winRates={live.winRates} accent={DOTA_RADIANT} teamAName={teamAName} teamBName={teamBName} />
        )}

        {/* Insight H2H */}
        {live.insight && (
          <div className="flex gap-2">
            {live.insight.teamOneLeagueMatchCount != null && live.insight.teamOneLeagueMatchCount > 0 && (
              <div className="flex-1 bg-bg-elevated/50 rounded px-3 py-2">
                <p className="text-[8px] font-mono text-text-muted/40 mb-1">League record</p>
                <p className="text-[13px] font-mono font-bold text-text-primary">
                  {live.insight.teamOneLeagueWinCount}/{live.insight.teamOneLeagueMatchCount}
                </p>
                <p className="text-[8px] font-mono text-text-muted/50 truncate">{teamAName}</p>
              </div>
            )}
            {live.insight.teamTwoLeagueMatchCount != null && live.insight.teamTwoLeagueMatchCount > 0 && (
              <div className="flex-1 bg-bg-elevated/50 rounded px-3 py-2">
                <p className="text-[8px] font-mono text-text-muted/40 mb-1">League record</p>
                <p className="text-[13px] font-mono font-bold text-text-primary">
                  {live.insight.teamTwoLeagueWinCount}/{live.insight.teamTwoLeagueMatchCount}
                </p>
                <p className="text-[8px] font-mono text-text-muted/50 truncate">{teamBName}</p>
              </div>
            )}
            {live.insight.teamOneVsWinCount != null && (
              <div className="flex-1 bg-bg-elevated/50 rounded px-3 py-2">
                <p className="text-[8px] font-mono text-text-muted/40 mb-1">H2H wins</p>
                <p className="text-[13px] font-mono font-bold text-text-primary">
                  {live.insight.teamOneVsWinCount} : {live.insight.teamTwoVsWinCount ?? 0}
                </p>
                <p className="text-[8px] font-mono text-text-muted/50">this tournament</p>
              </div>
            )}
          </div>
        )}

        {/* Game timeline (kills, roshan, buildings) */}
        <SeriesTimeline live={live} teamAName={teamAName} teamBName={teamBName} accent={DOTA_RADIANT} />

        {/* Roshan respawn */}
        {live.roshanRespawnTimer != null && live.roshanRespawnTimer > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 bg-bg-elevated/50 rounded">
            <span className="text-[9px] font-mono text-text-muted/50 uppercase">Roshan respawn</span>
            <span className="text-[11px] font-mono font-bold text-yellow-500/80">
              {fmtClock(live.roshanRespawnTimer)}
            </span>
          </div>
        )}

        {/* Building state */}
        {live.buildingState && (
          <div className="flex gap-2">
            {(['radiant', 'dire'] as const).map((side, si) => {
              const bs = live.buildingState![side]
              const name = si === 0 ? teamAName : teamBName
              const towers = bs.towers ?? []
              const barracks = bs.barracks ?? []
              return (
                <div key={side} className="flex-1 bg-bg-elevated/50 rounded px-3 py-2">
                  <p className="text-[8px] font-mono text-text-muted/40 mb-1.5 truncate">{name}</p>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[8px] font-mono text-text-muted/30 w-3">T</span>
                    <div className="flex gap-0.5">
                      {towers.map((alive, ti) => (
                        <div key={ti} className="w-2.5 h-3.5 rounded-sm"
                          style={{ background: alive ? '#4ade80' : 'rgba(255,255,255,0.07)' }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-mono text-text-muted/30 w-3">B</span>
                    <div className="flex gap-0.5">
                      {barracks.map((alive, bi) => (
                        <div key={bi} className="w-2.5 h-2.5 rounded-sm"
                          style={{ background: alive ? '#a78bfa' : 'rgba(255,255,255,0.07)' }} />
                      ))}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Players */}
        {live.players && live.players.length > 0 && (() => {
          const all = live.players
          const maxK = Math.max(...all.map(p => p.kills ?? 0))
          const maxA = Math.max(...all.map(p => p.assists ?? 0))
          const maxNW = Math.max(...all.map(p => p.networth ?? 0))
          const maxGPM = Math.max(...all.map(p => p.gpm ?? 0))
          const maxLVL = Math.max(...all.map(p => p.level ?? 0))
          const RADIANT = '#4ade80'
          const DIRE = '#ef4444'
          return (
            <div className="grid grid-cols-1 gap-2">
              {[
                { players: radiantPlayers, name: teamAName, color: RADIANT, label: 'RADIANT' },
                { players: direPlayers,    name: teamBName, color: DIRE,    label: 'DIRE' },
              ].map(({ players, name, color, label }) =>
                players.length > 0 && (
                  <div key={label} className="rounded-md border border-bg-border/60 overflow-hidden"
                    style={{ borderTop: `2px solid ${color}` }}>
                    {/* Side header */}
                    <div className="flex items-center justify-between px-3 py-1.5 bg-bg-elevated/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-mono font-bold tracking-wider" style={{ color }}>{label}</span>
                        <span className="text-[10px] font-mono text-text-secondary truncate">{name}</span>
                      </div>
                      <span className="text-[9px] font-mono tabular-nums text-text-muted/60">
                        {players.reduce((s, p) => s + (p.kills ?? 0), 0)} kills
                      </span>
                    </div>
                    {/* Column headers */}
                    <div className="grid items-center gap-2 px-2 py-1 text-[8px] font-mono uppercase tracking-wider text-text-muted/40"
                      style={{ gridTemplateColumns: '32px minmax(0,1fr) 40px 56px 48px 44px 28px' }}>
                      <span />
                      <span>Player</span>
                      <span className="text-right">LVL</span>
                      <span className="text-right">K/D/A</span>
                      <span className="text-right">NW</span>
                      <span className="text-right">GPM</span>
                      <span />
                    </div>
                    {/* Rows */}
                    <div className="flex flex-col">
                      {players.map((p, pi) => {
                        const hasItems = (p.itemTimeline?.length ?? 0) > 0
                        const kLead = maxK > 0 && p.kills === maxK
                        const aLead = maxA > 0 && p.assists === maxA
                        const nwLead = maxNW > 0 && p.networth === maxNW
                        const gpmLead = maxGPM > 0 && p.gpm === maxGPM
                        const lvlLead = maxLVL > 0 && p.level === maxLVL
                        return (
                          <details key={pi} className="group border-t border-bg-border/30 first:border-t-0">
                            <summary className="grid items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-white/[0.02] transition-colors list-none"
                              style={{ gridTemplateColumns: '32px minmax(0,1fr) 40px 56px 48px 44px 28px' }}>
                              <HeroPortrait heroImg={p.heroImg} heroName={p.heroName} size={32} sideColor={color} />
                              <span className="text-[11px] font-mono text-text-secondary truncate">{p.name ?? `Player ${pi + 1}`}</span>
                              <span className={`text-right text-[10px] font-mono tabular-nums ${lvlLead ? 'text-text-primary font-bold' : 'text-text-muted/60'}`}>
                                {p.level ?? '—'}
                              </span>
                              <span className="text-right text-[11px] font-mono tabular-nums">
                                <span className={kLead ? 'font-bold' : ''} style={kLead ? { color } : undefined}>{p.kills ?? 0}</span>
                                <span className="text-text-muted/40">/</span>
                                <span className="text-text-muted/70">{p.deaths ?? 0}</span>
                                <span className="text-text-muted/40">/</span>
                                <span className={aLead ? 'font-bold' : ''} style={aLead ? { color } : undefined}>{p.assists ?? 0}</span>
                              </span>
                              <span className={`text-right text-[10px] font-mono tabular-nums ${nwLead ? 'font-bold text-text-primary' : 'text-text-muted/70'}`}>
                                {p.networth != null ? fmtK(p.networth) : '—'}
                              </span>
                              <span className={`text-right text-[10px] font-mono tabular-nums ${gpmLead ? 'font-bold text-yellow-400' : 'text-yellow-500/50'}`}>
                                {p.gpm ?? '—'}
                              </span>
                              <span className="text-right text-text-muted/40 text-[10px] select-none" aria-hidden>
                                {hasItems ? <span className="group-open:hidden">+</span> : null}
                                {hasItems ? <span className="hidden group-open:inline">−</span> : null}
                              </span>
                            </summary>
                            {hasItems && (
                              <div className="flex gap-0.5 overflow-x-auto px-10 pb-2 pt-0.5 scrollbar-thin bg-bg-elevated/20">
                                {p.itemTimeline!.slice(-14).map((it, ii) => (
                                  <div key={ii} className="shrink-0 flex flex-col items-center gap-0.5" title={`${it.name ?? it.itemId} @ ${fmtClock(it.time)}`}>
                                    {it.img ? (
                                      <img src={it.img} alt={it.name ?? ''} className="w-5 h-5 rounded"
                                        style={{ border: '1px solid rgba(255,255,255,0.06)' }} />
                                    ) : (
                                      <div className="w-5 h-5 rounded bg-bg-elevated/50 border border-white/5" />
                                    )}
                                    <span className="text-[7px] font-mono text-text-muted/50 tabular-nums">{fmtClock(it.time)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </details>
                        )
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          )
        })()}
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
                background: i === idx ? 'rgba(145,70,255,0.18)' : 'rgba(255,255,255,0.04)',
                color: i === idx ? '#b388ff' : 'rgb(var(--text-muted))',
                border: `1px solid ${i === idx ? 'rgba(145,70,255,0.35)' : 'rgba(255,255,255,0.08)'}`,
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
  const finished = matches.filter(m => m.finished && m.outcome)
  if (!matches.length) return (
    <span className="text-[10px] font-mono text-text-muted/40">No recent data</span>
  )
  return (
    <div className="flex gap-0.5">
      {matches.slice(0, 5).map(m => {
        const isW = m.outcome === 'W'
        const isL = m.outcome === 'L'
        const bg  = isW ? accent : isL ? 'rgba(255,77,77,0.4)' : 'rgba(255,255,255,0.08)'
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
      {!finished.length && <span className="text-[9px] font-mono text-text-muted/40 ml-1">no results</span>}
    </div>
  )
}

function RecentMatchRow({ m }: { m: EsportsRecentMatch }) {
  const color = m.outcome === 'W' ? '#4ade80' : m.outcome === 'L' ? '#f87171' : '#888'
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-white/[0.02] transition-colors">
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
      <span className="text-[9px] font-mono text-text-muted/30 shrink-0 tabular-nums w-12 text-right">
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

function OddsBar({ yesPrice, noPrice, teamA, teamB, accentA }: {
  yesPrice: number; noPrice: number; teamA: string; teamB: string; accentA?: string | null
}) {
  const pct = Math.round(yesPrice * 100)
  if (!pct) return null
  if (yesPrice === 0.5) return null
  const color = accentA ?? 'var(--accent)'
  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
      <p className="text-[10px] font-mono text-text-muted mb-2 uppercase tracking-wider">Win probability</p>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] font-mono text-text-primary w-24 truncate">{teamA}</span>
        <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-[11px] font-mono text-text-primary w-24 truncate text-right">{teamB}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-[11px] font-mono font-bold" style={{ color }}>{pct}%</span>
        <span className="text-[11px] font-mono font-bold text-text-muted">{100 - pct}%</span>
      </div>
    </div>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DotaMatchScreen({ seriesId }: { seriesId: string }) {
  const router = useRouter()

  const fetcher = useCallback(() => api.getEsportsMatch(seriesId), [seriesId])
  const { data, loading, isRefreshing } = usePolling(fetcher, 10_000, seriesId)
  const match = data as EsportsMatchDetail | null

  const titleTeams = match ? `${match.teamA?.name ?? '?'} vs ${match.teamB?.name ?? '?'}` : null
  usePageTitle(titleTeams ? `${titleTeams} — Esports` : 'Match')

  const isLive     = match?.status === 'live'
  const isFinished = match?.status === 'finished'
  const isDota     = true
  const isCs2      = false

  const teamA = match?.teamA as EsportsTeamDetail | undefined
  const teamB = match?.teamB as EsportsTeamDetail | undefined
  const scoreA = teamA?.score ?? null
  const scoreB = teamB?.score ?? null

  const accent = teamA?.colorPrimary ?? nameToColor(teamA?.name ?? '')

  const gameSlug = 'dota2'

  const steamMatchId = (match?.steamData?.games as { matchId?: number }[] | undefined)
    ?.find(g => g.matchId)?.matchId

  // ─── Skeleton ────────────────────────────────────────────────────────────────
  if (loading && !match) {
    return (
      <div className="w-full max-w-3xl mx-auto px-6 py-6 flex flex-col gap-4">
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
      <div className="w-full max-w-3xl mx-auto px-6 py-20 text-center flex flex-col items-center gap-3">
        <p className="text-sm font-mono text-text-muted">Match not found</p>
        <Link href="/cybersport/cs2" prefetch={false}
          className="text-[11px] font-mono text-text-muted/70 hover:text-text-primary underline underline-offset-2">
          ← Back to esports
        </Link>
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="w-full max-w-3xl mx-auto px-6 py-6 flex flex-col gap-4">

      {/* Back + badges */}
      <div className="flex items-center justify-between">
        <button onClick={() => window.history.length > 1 ? router.back() : router.push(`/cybersport/${gameSlug}`)}
          className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors">
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
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
            </span>
          )}
          {isFinished && (
            <span className="text-[9px] font-mono text-text-muted border border-bg-border px-2 py-0.5 rounded">FINISHED</span>
          )}
        </div>
      </div>

      {/* Match header */}
      <div className="bg-bg-surface border border-bg-border rounded-lg p-4 sm:p-5"
        style={isLive ? { borderTop: `3px solid ${accent}` } : undefined}>

        {/* Context chip row */}
        {(match.tournament || match.format) && (
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            {match.tournament && (
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-bg-elevated/60 border border-bg-border/60 text-text-secondary">
                {match.tournament}
              </span>
            )}
            {match.format && (
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-bg-border/60 text-text-muted">
                {(() => {
                  const f = String(match.format).toLowerCase()
                  const m = f.match(/bo\s*(\d+)/) ?? f.match(/best.?of.?(\d+)/)
                  return m ? `Best of ${m[1]}` : match.format.toUpperCase()
                })()}
              </span>
            )}
            {isLive && match.games && match.games.length > 0 && (
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,61,61,0.12)', color: '#ff3d3d', border: '1px solid rgba(255,61,61,0.25)' }}>
                Map {match.games.length}
              </span>
            )}
          </div>
        )}

        {/* Teams + score */}
        <div className="flex items-center gap-2 sm:gap-4 relative">
          {/* Winner subtle backdrop */}
          {isFinished && scoreA != null && scoreB != null && scoreA !== scoreB && (
            <div aria-hidden className="absolute inset-0 pointer-events-none rounded-md"
              style={{
                background: `linear-gradient(${scoreA > scoreB ? '90deg' : '270deg'}, ${accent}14, transparent 55%)`,
              }} />
          )}
          {/* Team A */}
          <div className="flex-1 min-w-0 flex flex-col items-start gap-2 relative">
            {teamA?.id ? (
              <Link href={`/cybersport/${gameSlug}/team/${teamA.id}`} prefetch={false}>
                <TeamLogo team={teamA} size={36} />
              </Link>
            ) : teamA && <TeamLogo team={teamA} size={36} />}
            <div className="min-w-0 w-full">
              {teamA?.id ? (
                <Link
                  href={`/cybersport/${gameSlug}/team/${teamA.id}`}
                  prefetch={false}
                  className="block text-[13px] sm:text-[15px] font-mono font-bold text-text-primary leading-tight hover:underline underline-offset-2 text-left break-words"
                >
                  {teamA?.name ?? '—'}
                </Link>
              ) : (
                <span className="block text-[13px] sm:text-[15px] font-mono font-bold text-text-primary leading-tight break-words">
                  {teamA?.name ?? '—'}
                </span>
              )}
              {isFinished && scoreA != null && scoreA > (scoreB ?? 0) && (
                <p className="text-[10px] font-mono mt-0.5" style={{ color: accent }}>WINNER</p>
              )}
              {teamA?.players && teamA.players.length > 0 && (
                <p className="hidden sm:block text-[9px] font-mono text-text-muted/50 mt-0.5 truncate">
                  {teamA.players.map(p => p.nickname ?? p.name).filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>

          {/* Score */}
          <div className="shrink-0 text-center px-1 sm:px-2">
            {(isLive || isFinished) && scoreA != null && scoreB != null ? (
              <div className="flex items-center gap-1.5 sm:gap-3">
                <span className="text-2xl sm:text-4xl font-mono font-bold text-text-primary">{scoreA}</span>
                <span className="text-text-muted/50 text-lg sm:text-2xl">:</span>
                <span className="text-2xl sm:text-4xl font-mono font-bold text-text-primary">{scoreB}</span>
              </div>
            ) : (
              <span className="text-xl sm:text-2xl font-mono text-text-muted/50">vs</span>
            )}
            {(isLive || isFinished) && match.format && (() => {
              const m = String(match.format).toLowerCase().match(/bo\s*(\d+)/) ?? String(match.format).toLowerCase().match(/best.?of.?(\d+)/)
              const need = m ? Math.ceil(Number(m[1]) / 2) : null
              return need ? (
                <p className="text-[9px] font-mono text-text-muted/60 mt-1">First to {need}</p>
              ) : null
            })()}
          </div>

          {/* Team B */}
          <div className="flex-1 min-w-0 flex flex-col items-end gap-2 relative">
            {teamB?.id ? (
              <Link href={`/cybersport/${gameSlug}/team/${teamB.id}`} prefetch={false}>
                <TeamLogo team={teamB} size={36} />
              </Link>
            ) : teamB && <TeamLogo team={teamB} size={36} />}
            <div className="text-right min-w-0 w-full">
              {teamB?.id ? (
                <Link
                  href={`/cybersport/${gameSlug}/team/${teamB.id}`}
                  prefetch={false}
                  className="block text-[13px] sm:text-[15px] font-mono font-bold text-text-primary leading-tight hover:underline underline-offset-2 text-right break-words"
                >
                  {teamB?.name ?? '—'}
                </Link>
              ) : (
                <span className="block text-[13px] sm:text-[15px] font-mono font-bold text-text-primary leading-tight break-words">
                  {teamB?.name ?? '—'}
                </span>
              )}
              {isFinished && scoreB != null && scoreB > (scoreA ?? 0) && (
                <p className="text-[10px] font-mono mt-0.5 text-right" style={{ color: accent }}>WINNER</p>
              )}
              {teamB?.players && teamB.players.length > 0 && (
                <p className="hidden sm:block text-[9px] font-mono text-text-muted/50 mt-0.5 truncate">
                  {teamB.players.map(p => p.nickname ?? p.name).filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="mt-4 pt-3 border-t border-bg-border/40 flex flex-wrap items-center gap-x-3 gap-y-1">
          {match.startsAt && !isLive && !isFinished && (
            <>
              <span className="text-[10px] font-mono text-text-muted">{fmtTime(match.startsAt)}</span>
              <Countdown startsAt={match.startsAt} />
            </>
          )}
          {isLive && match.liveState?.duration && fmtDuration(match.liveState.duration) && (
            <span className="text-[10px] font-mono text-text-muted/60">
              Series duration: {fmtDuration(match.liveState.duration)}
            </span>
          )}
          {isLive && match.liveState?.updatedAt && (
            <span className="text-[10px] font-mono text-text-muted/40 ml-auto">
              upd {new Date(match.liveState.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {isRefreshing && (
            <svg className="w-3 h-3 animate-spin text-text-muted/30 ml-auto shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12a9 9 0 11-6.219-8.56"/>
            </svg>
          )}
        </div>
      </div>

      {/* Steam Live (Dota2) */}
      {isDota && steamMatchId && (
        <Link href={`/cybersport/dota/${steamMatchId}`} prefetch={false}
          className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: 'rgba(255,200,0,0.05)', border: '1px solid rgba(255,200,0,0.2)' }}>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,200,0,0.12)', color: '#f5c842', border: '1px solid rgba(255,200,0,0.2)' }}>
              STEAM LIVE
            </span>
            <span className="text-[11px] font-mono text-text-muted">Live minimap, heroes · ~2 min DotaTV delay</span>
          </div>
          <span className="text-[11px] font-mono shrink-0" style={{ color: accent }}>View →</span>
        </Link>
      )}

      {/* Series draft (Dota2) */}
      {isDota && (match.draft?.length ?? 0) > 0 && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
          <p className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-2">Series Draft</p>
          <DraftRow actions={match.draft!} teamAId={teamA?.id} teamBId={teamB?.id} accent={accent} />
        </div>
      )}

      {/* Live stream embed */}
      {isLive && (match.streams?.length ?? 0) > 0 && (
        <StreamPlayer urls={match.streams!} />
      )}

      {/* Pre-match (tournament, streams, recent form, H2H) */}
      {!isLive && !isFinished && match.preMatch && (() => {
        const pm = match.preMatch
        const empty = !pm.tournament && (pm.streams?.length ?? 0) === 0
          && (pm.recentA?.length ?? 0) === 0 && (pm.recentB?.length ?? 0) === 0
          && (pm.h2h?.matches?.length ?? 0) === 0
        if (empty) return (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-[11px] font-mono text-amber-300/90">
              Детали матча (составы, форма, потоки) недоступны — ограничение GRID dev-ключа.
            </p>
          </div>
        )
        return (
          <PreMatchSection pre={pm}
            teamAName={teamA?.name ?? '—'} teamBName={teamB?.name ?? '—'} accent={accent} />
        )
      })()}

      {/* Games / Maps */}
      {(match.games?.length ?? 0) > 0 && (
        <GamesTabs
          games={match.games}
          teamA={teamA ?? { name: '—' } as EsportsTeamDetail}
          teamB={teamB ?? { name: '—' } as EsportsTeamDetail}
          isDota={isDota}
          isCs2={isCs2}
          accent={accent}
        />
      )}

      {/* Live but no game data yet */}
      {(match.games?.length ?? 0) === 0 && isLive && (
        <div className="bg-bg-surface border rounded-lg px-5 py-4 flex items-center gap-3"
          style={{ borderColor: `${accent}33`, borderLeft: `3px solid ${accent}` }}>
          <span className="w-2 h-2 rounded-full animate-pulse shrink-0" style={{ background: accent }} />
          <div>
            <p className="text-[11px] font-mono font-bold text-text-primary">
              {isDota ? 'Game 1 in progress' : 'Map 1 in progress'}
            </p>
            <p className="text-[10px] font-mono text-text-muted/60 mt-0.5">Live stats will appear shortly</p>
          </div>
        </div>
      )}

      {(match.games?.length ?? 0) === 0 && !isLive && !isFinished && (
        <div className="bg-bg-surface border border-bg-border rounded-lg px-4 py-8 text-center">
          <p className="text-[11px] font-mono text-text-muted">No maps data yet</p>
          <p className="text-[10px] font-mono text-text-muted/50 mt-1">Live data will appear once the match starts</p>
        </div>
      )}

      {/* Dota 2 live data */}
      {isDota && isLive && match.dotaLive && (
        <DotaLiveSection
          live={match.dotaLive}
          teamAName={teamA?.name ?? '—'}
          teamBName={teamB?.name ?? '—'}
          accent={accent}
        />
      )}

      {/* Markets — Prescio Fair Price */}
      {match.markets?.length > 0 && (
        <MarketsPanel markets={match.markets} teamA={teamA} teamB={teamB} accent={accent} />
      )}

      {!match.markets?.length && match.yesPrice != null && match.yesPrice !== 0.5 && (
        <OddsBar yesPrice={match.yesPrice} noPrice={match.noPrice}
          teamA={teamA?.name ?? '—'} teamB={teamB?.name ?? '—'}
          accentA={teamA?.colorPrimary} />
      )}

    </div>
    </ErrorBoundary>
  )
}
