'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import DotaMinimap from '../components/dota/DotaMinimap'
import type { DotaLiveMatch, DotaMatchDetail, DotaHero, DotaMatchPlayer } from '../types/dota'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  const neg = secs < 0
  const abs = Math.abs(secs)
  const m = Math.floor(abs / 60)
  const s = abs % 60
  return `${neg ? '-' : ''}${m}:${String(s).padStart(2, '0')}`
}

function formatK(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

function WinRateBar({ radiantLead }: { radiantLead: number }) {
  const maxGold = 15000
  const clamped = Math.max(-maxGold, Math.min(maxGold, radiantLead))

  return (
    <div className="relative h-1.5 rounded-full overflow-hidden bg-bg-border">
      <div
        className="absolute top-0 h-full rounded-full transition-all duration-500"
        style={{
          left: clamped >= 0 ? '50%' : `${50 + (clamped / maxGold) * 50}%`,
          width: `${Math.abs(clamped / maxGold) * 50}%`,
          background: clamped >= 0 ? '#00e5a0' : '#ff4f6a',
          opacity: 0.8,
        }}
      />
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-bg-border" />
    </div>
  )
}

function HeroImage({ heroId, heroImg, size = 36 }: { heroId: number; heroImg: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  if (!heroImg || failed) {
    return (
      <div className="rounded shrink-0 flex items-center justify-center text-[9px] font-mono bg-bg-elevated text-text-muted"
        style={{ width: size, height: Math.round(size * 0.56) }}>
        {heroId}
      </div>
    )
  }
  return (
    <div className="rounded overflow-hidden shrink-0" style={{ width: size, height: Math.round(size * 0.56) }}>
      <img src={heroImg} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} draggable={false} />
    </div>
  )
}

function PlayerRow({ player, isRadiant }: { player: DotaMatchPlayer; isRadiant: boolean }) {
  const color = isRadiant ? '#00e5a0' : '#ff4f6a'
  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded hover:bg-bg-elevated transition-colors">
      <HeroImage heroId={player.heroId} heroImg={player.heroImg} size={40} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-mono font-bold leading-none truncate text-text-primary">
          {player.name ?? player.heroName}
        </p>
        {player.teamName && (
          <p className="text-[9px] font-mono mt-0.5 truncate text-text-muted">{player.teamName}</p>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0 text-[11px] font-mono">
        <span className="font-bold" style={{ color }}>{player.kills}/{player.deaths}/{player.assists}</span>
        <span className="text-text-muted">{formatK(player.networth)}</span>
        <span className="text-text-muted opacity-60">lv{player.level}</span>
      </div>
    </div>
  )
}

// ─── Live view ────────────────────────────────────────────────────────────────

function LiveView({ matchId, serverSteamId }: { matchId: string; serverSteamId?: string }) {
  const [liveData, setLiveData] = useState<DotaLiveMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [heroes, setHeroes] = useState<Record<number, DotaHero>>({})
  const [showMinimap, setShowMinimap] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLive = useCallback(async () => {
    try {
      const data = await api.getDotaLiveMatch(matchId, serverSteamId)
      setLiveData(data)
    } catch { /* keep previous data */ }
    setLoading(false)
  }, [matchId, serverSteamId])

  useEffect(() => {
    api.getDotaHeroes().then(r => {
      const map: Record<number, DotaHero> = {}
      for (const h of (r.heroes ?? [])) map[h.id] = h
      setHeroes(map)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetchLive()
    intervalRef.current = setInterval(fetchLive, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [fetchLive])

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="rounded-xl h-12 bg-bg-surface border border-bg-border" />
        <div className="rounded-xl h-64 bg-bg-surface border border-bg-border" />
      </div>
    )
  }

  if (!liveData) {
    return (
      <div className="text-center py-12">
        <p className="text-sm font-mono text-text-muted">Live data not available for this match</p>
      </div>
    )
  }

  const radiantPlayers = liveData.players.filter(p => p.isRadiant)
  const direPlayers = liveData.players.filter(p => !p.isRadiant)
  const heroImages: Record<number, string> = {}
  for (const p of liveData.players) {
    if (heroes[p.heroId]) heroImages[p.heroId] = heroes[p.heroId].img
  }

  const latestWR = liveData.liveWinRates.length > 0
    ? liveData.liveWinRates[liveData.liveWinRates.length - 1].winRate
    : 0.5

  return (
    <div className="space-y-4">
      {/* Score header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-surface border border-bg-border">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-mono font-bold" style={{ color: '#ff3d3d' }}>LIVE</span>
          <span className="text-[11px] font-mono ml-2 text-text-secondary">
            {formatTime(liveData.gameTime)}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[28px] font-mono font-bold leading-none" style={{ color: '#00e5a0', letterSpacing: '-1px' }}>{liveData.radiantScore}</span>
          <span className="text-[20px] font-mono text-text-muted opacity-40">:</span>
          <span className="text-[28px] font-mono font-bold leading-none" style={{ color: '#ff4f6a', letterSpacing: '-1px' }}>{liveData.direScore}</span>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-mono text-text-muted">{liveData.spectators} watching</p>
          {liveData.insight && (
            <p className="text-[9px] font-mono mt-0.5 text-text-muted opacity-60">
              {liveData.insight.teamOneLeagueWinCount}W/{liveData.insight.teamOneLeagueMatchCount - liveData.insight.teamOneLeagueWinCount}L
            </p>
          )}
        </div>
      </div>

      {/* Win rate bar */}
      <div className="px-2 space-y-1">
        <div className="flex justify-between text-[9px] font-mono text-text-muted">
          <span>Radiant {Math.round(latestWR * 100)}%</span>
          <span>Dire {Math.round((1 - latestWR) * 100)}%</span>
        </div>
        <WinRateBar radiantLead={liveData.radiantLead} />
      </div>

      {/* Minimap toggle + view */}
      <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
            Minimap {liveData.hasPositions ? '' : '· no realtime positions'}
          </span>
          <button
            onClick={() => setShowMinimap(v => !v)}
            className="text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors"
          >
            {showMinimap ? 'HIDE' : 'SHOW'}
          </button>
        </div>
        {showMinimap && (
          <div className="p-2" style={{ maxWidth: '380px', margin: '0 auto' }}>
            <DotaMinimap
              players={liveData.players}
              buildingState={liveData.buildingState}
              heroImages={heroImages}
            />
          </div>
        )}
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Radiant */}
        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border" style={{ borderColor: 'rgba(0,229,160,0.2)' }}>
          <div className="px-3 py-2 border-b" style={{ background: 'rgba(0,229,160,0.05)', borderColor: 'rgba(0,229,160,0.12)' }}>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: '#00e5a0' }}>
              Radiant · {liveData.radiantScore}K
            </span>
          </div>
          <div className="p-1">
            {radiantPlayers.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-elevated transition-colors">
                {heroes[p.heroId] && (
                  <HeroImage heroId={p.heroId} heroImg={heroes[p.heroId].img} size={36} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono truncate text-text-primary">
                    {p.name ?? heroes[p.heroId]?.localizedName ?? `Hero ${p.heroId}`}
                  </p>
                  <p className="text-[9px] font-mono text-text-muted">lv{p.level}</p>
                </div>
                <div className="text-right text-[10px] font-mono shrink-0">
                  <p className="font-bold" style={{ color: '#00e5a0' }}>{p.numKills}/{p.numDeaths}/{p.numAssists}</p>
                  <p className="text-text-muted">{formatK(p.networth)}</p>
                </div>
                {p.respawnTimer > 0 && (
                  <span className="text-[9px] font-mono font-bold shrink-0" style={{ color: '#ff4f6a' }}>{p.respawnTimer}s</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dire */}
        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border" style={{ borderColor: 'rgba(255,79,106,0.2)' }}>
          <div className="px-3 py-2 border-b" style={{ background: 'rgba(255,79,106,0.05)', borderColor: 'rgba(255,79,106,0.12)' }}>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: '#ff4f6a' }}>
              Dire · {liveData.direScore}K
            </span>
          </div>
          <div className="p-1">
            {direPlayers.map((p, i) => (
              <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg-elevated transition-colors">
                {heroes[p.heroId] && (
                  <HeroImage heroId={p.heroId} heroImg={heroes[p.heroId].img} size={36} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-mono truncate text-text-primary">
                    {p.name ?? heroes[p.heroId]?.localizedName ?? `Hero ${p.heroId}`}
                  </p>
                  <p className="text-[9px] font-mono text-text-muted">lv{p.level}</p>
                </div>
                <div className="text-right text-[10px] font-mono shrink-0">
                  <p className="font-bold" style={{ color: '#ff4f6a' }}>{p.numKills}/{p.numDeaths}/{p.numAssists}</p>
                  <p className="text-text-muted">{formatK(p.networth)}</p>
                </div>
                {p.respawnTimer > 0 && (
                  <span className="text-[9px] font-mono font-bold shrink-0" style={{ color: '#ff4f6a' }}>{p.respawnTimer}s</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Draft */}
      {liveData.pickBans.length > 0 && (
        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
          <div className="px-3 py-2 border-b border-bg-border">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Draft</span>
          </div>
          <div className="p-3 flex flex-wrap gap-2">
            {liveData.pickBans
              .filter(pb => pb.isPick)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((pb, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  {pb.heroImg ? (
                    <div className="rounded overflow-hidden bg-bg-elevated" style={{ width: 40, height: 23 }}>
                      <img src={pb.heroImg} alt={pb.heroName ?? ''} className="w-full h-full object-cover" draggable={false} />
                    </div>
                  ) : (
                    <div className="rounded flex items-center justify-center text-[8px] font-mono bg-bg-elevated text-text-muted"
                      style={{ width: 40, height: 23 }}>
                      {pb.heroId ?? '?'}
                    </div>
                  )}
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: pb.isRadiant ? '#00e5a0' : '#ff4f6a' }}
                  />
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Finished match view ──────────────────────────────────────────────────────

function FinishedView({ matchId }: { matchId: string }) {
  const [data, setData] = useState<DotaMatchDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDotaMatch(matchId).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [matchId])

  if (loading) {
    return <div className="animate-pulse rounded-xl h-64 bg-bg-surface border border-bg-border" />
  }

  if (!data) {
    return <div className="text-center py-12"><p className="text-sm font-mono text-text-muted">Match data not available</p></div>
  }

  const radiantPlayers = data.players.filter(p => p.isRadiant)
  const direPlayers = data.players.filter(p => !p.isRadiant)
  const winner = data.didRadiantWin ? data.radiantTeam?.name ?? 'Radiant' : data.direTeam?.name ?? 'Dire'
  const winnerColor = data.didRadiantWin ? '#00e5a0' : '#ff4f6a'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-surface border border-bg-border">
        <div>
          <p className="text-[10px] font-mono text-text-muted">
            {data.leagueName ?? 'Pro Match'}
          </p>
          <p className="text-base font-mono font-bold" style={{ color: winnerColor }}>
            {winner} wins
          </p>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[22px] font-mono font-bold leading-none"
            style={{ color: data.didRadiantWin ? '#00e5a0' : 'rgba(255,255,255,0.35)' }}>
            {data.players.filter(p => p.isRadiant && p.isVictory).length > 0
              ? data.players.filter(p => p.isRadiant).reduce((s, p) => s + p.kills, 0)
              : '—'}
          </span>
          <span className="text-[16px] font-mono text-text-muted opacity-40">:</span>
          <span className="text-[22px] font-mono font-bold leading-none"
            style={{ color: !data.didRadiantWin ? '#ff4f6a' : 'rgba(255,255,255,0.35)' }}>
            {data.players.filter(p => !p.isRadiant).reduce((s, p) => s + p.kills, 0)}
          </span>
        </div>
        {data.duration && (
          <p className="text-[11px] font-mono text-text-muted">
            {formatTime(data.duration)}
          </p>
        )}
      </div>

      {/* NW chart */}
      {data.radiantNetworthLeads && data.radiantNetworthLeads.length > 1 && (
        <div className="rounded-xl p-3 bg-bg-surface border border-bg-border">
          <p className="text-[9px] font-mono uppercase tracking-wider mb-2 text-text-muted">
            Gold advantage per minute
          </p>
          <div className="relative" style={{ height: '40px' }}>
            <svg viewBox="0 0 400 40" className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="20" x2="400" y2="20" stroke="rgba(128,128,128,0.15)" strokeWidth="1" />
              {(() => {
                const d = data.radiantNetworthLeads!
                const max = Math.max(...d.map(Math.abs), 1000)
                const pts = d.map((v, i) => {
                  const x = (i / (d.length - 1)) * 400
                  const y = 20 - (v / max) * 18
                  return `${x.toFixed(1)},${y.toFixed(1)}`
                }).join(' ')
                return (
                  <polyline points={pts} fill="none"
                    stroke={d[d.length - 1] >= 0 ? '#00e5a0' : '#ff4f6a'}
                    strokeWidth="1.5" strokeLinejoin="round" />
                )
              })()}
            </svg>
          </div>
        </div>
      )}

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          { label: `Radiant${data.radiantTeam?.name ? ` · ${data.radiantTeam.name}` : ''}`, players: radiantPlayers, color: '#00e5a0', won: data.didRadiantWin === true },
          { label: `Dire${data.direTeam?.name ? ` · ${data.direTeam.name}` : ''}`, players: direPlayers, color: '#ff4f6a', won: data.didRadiantWin === false },
        ].map(({ label, players, color, won }) => (
          <div key={label} className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border"
            style={{ borderColor: `${color}33` }}>
            <div className="flex items-center justify-between px-3 py-2 border-b"
              style={{ background: `${color}08`, borderColor: `${color}18` }}>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color }}>
                {label}
              </span>
              {won && <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}18`, color }}>WIN</span>}
            </div>
            <div className="p-1">
              {players.map((p, i) => <PlayerRow key={i} player={p} isRadiant={p.isRadiant} />)}
            </div>
          </div>
        ))}
      </div>

      {/* Draft */}
      {data.pickBans.length > 0 && (
        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
          <div className="px-3 py-2 border-b border-bg-border">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Draft</span>
          </div>
          <div className="p-3">
            <div className="grid grid-cols-2 gap-4">
              {(['radiant', 'dire'] as const).map(side => {
                const isRadiant = side === 'radiant'
                const picks = data.pickBans.filter(pb => pb.isPick && pb.isRadiant === isRadiant)
                const bans = data.pickBans.filter(pb => !pb.isPick && pb.isRadiant === isRadiant)
                const color = isRadiant ? '#00e5a0' : '#ff4f6a'
                return (
                  <div key={side}>
                    <p className="text-[9px] font-mono uppercase mb-2" style={{ color }}>Picks</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {picks.map((pb, i) => pb.heroImg ? (
                        <div key={i} className="rounded overflow-hidden" style={{ width: 36, height: 21 }}>
                          <img src={pb.heroImg} alt={pb.heroName ?? ''} className="w-full h-full object-cover" draggable={false} />
                        </div>
                      ) : null)}
                    </div>
                    <p className="text-[9px] font-mono uppercase mb-2 text-text-muted">Bans</p>
                    <div className="flex flex-wrap gap-1 opacity-40">
                      {bans.map((pb, i) => pb.heroImg ? (
                        <div key={i} className="rounded overflow-hidden grayscale" style={{ width: 28, height: 16 }}>
                          <img src={pb.heroImg} alt={pb.heroName ?? ''} className="w-full h-full object-cover" draggable={false} />
                        </div>
                      ) : null)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface Props {
  matchId: string
}

export default function DotaMatchScreen({ matchId }: Props) {
  usePageTitle(`Match ${matchId}`)
  const router = useRouter()
  const searchParams = useSearchParams()
  const serverSteamId = searchParams?.get('server_steam_id') ?? undefined

  const [isLive, setIsLive] = useState(true)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 text-text-primary">
      {/* Back */}
      <button
        onClick={() => router.push('/dota')}
        className="flex items-center gap-1.5 text-[11px] font-mono mb-5 text-text-muted hover:text-text-secondary transition-colors"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        BACK TO DOTA
      </button>

      {/* Tab: Live / Stats */}
      <div className="flex items-center gap-0.5 bg-bg-surface border border-bg-border rounded p-1 w-fit mb-5">
        {([
          { key: true, label: 'LIVE' },
          { key: false, label: 'STATS' },
        ] as { key: boolean; label: string }[]).map(({ key, label }) => (
          <button
            key={String(key)}
            onClick={() => setIsLive(key)}
            className={`px-4 py-1.5 text-[11px] font-mono font-bold rounded transition-colors ${
              isLive === key ? 'bg-bg-elevated text-text-primary' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLive
        ? <LiveView matchId={matchId} serverSteamId={serverSteamId} />
        : <FinishedView matchId={matchId} />
      }
    </div>
  )
}
