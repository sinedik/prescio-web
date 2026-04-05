'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import DotaMinimap from '../components/dota/DotaMinimap'
import type { DotaLiveMatch, DotaMatchDetail, DotaHero, DotaItem, DotaLivePlayer, DotaMatchPlayer } from '../types/dota'
import type { EsportsMatchDetail } from '../types'

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

function HeroImage({ heroId, heroImg, size = 44 }: { heroId: number; heroImg: string | null; size?: number }) {
  const [failed, setFailed] = useState(false)
  const h = Math.round(size * 0.56)
  if (!heroImg || failed) {
    return (
      <div className="rounded shrink-0 flex items-center justify-center text-[9px] font-mono bg-bg-elevated text-text-muted"
        style={{ width: size, height: h }}>
        {heroId}
      </div>
    )
  }
  return (
    <div className="rounded overflow-hidden shrink-0" style={{ width: size, height: h }}>
      <img src={heroImg} alt="" className="w-full h-full object-cover" onError={() => setFailed(true)} draggable={false} />
    </div>
  )
}

const AEGIS_ID = 117

function ItemSlot({ itemId, itemMap, size = 26 }: { itemId: number | null | undefined; itemMap: Record<number, DotaItem>; size?: number }) {
  const [failed, setFailed] = useState(false)
  const item = itemId ? itemMap[itemId] : null
  if (!item || failed) {
    return <div className="rounded shrink-0 bg-bg-elevated border border-bg-border" style={{ width: size, height: Math.round(size * 0.75) }} />
  }
  return (
    <div className="rounded overflow-hidden shrink-0 border border-bg-border" style={{ width: size, height: Math.round(size * 0.75) }}>
      <img src={item.img} alt={item.displayName} title={item.displayName}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)} draggable={false} />
    </div>
  )
}

function ItemSlots({ itemIds, neutralItemId, itemMap, size = 26 }: {
  itemIds: number[]
  neutralItemId?: number | null
  itemMap: Record<number, DotaItem>
  size?: number
}) {
  const slots = Array.from({ length: 6 }, (_, i) => itemIds[i] ?? null)
  return (
    <div className="flex items-center gap-0.5">
      <div className="flex gap-0.5">
        {slots.map((id, i) => <ItemSlot key={i} itemId={id} itemMap={itemMap} size={size} />)}
      </div>
      {neutralItemId !== undefined && (
        <div className="ml-1">
          <ItemSlot itemId={neutralItemId} itemMap={itemMap} size={size} />
        </div>
      )}
    </div>
  )
}

// ─── Live player row ──────────────────────────────────────────────────────────

function LivePlayerRow({ p, side, itemMap, elapsed = 0 }: { p: DotaLivePlayer; side: 'radiant' | 'dire'; itemMap: Record<number, DotaItem>; elapsed?: number }) {
  const [imgFailed, setImgFailed] = useState(false)
  const color = side === 'radiant' ? '#00e5a0' : '#ff4f6a'
  const respawnTimer = Math.max(0, p.respawnTimer - elapsed)
  const isDead = respawnTimer > 0
  const hasAegis = p.items.includes(AEGIS_ID)
  const w = 36, h = Math.round(w * 0.56)
  const ultColor = p.ultimateState === 3 ? '#00e5a0' : p.ultimateState === 2 ? '#f5c842' : '#4fc3f7'
  const showUlt = p.ultimateState > 0

  return (
    <div className="flex flex-col gap-1 px-2 py-1.5 rounded hover:bg-bg-elevated transition-colors">
      <div className="flex items-center gap-2">
        <div className="relative shrink-0 rounded overflow-hidden" style={{ width: w, height: h }}>
          {p.heroImg && !imgFailed ? (
            <img src={p.heroImg} alt="" className="w-full h-full object-cover"
              onError={() => setImgFailed(true)} draggable={false} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[9px] font-mono bg-bg-elevated text-text-muted">
              {p.heroId}
            </div>
          )}
          {isDead && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
              <span className="font-mono font-bold text-[10px]" style={{ color: '#ff4f6a' }}>{respawnTimer}s</span>
            </div>
          )}
          {showUlt && <div className="absolute top-0 left-0 w-2 h-2 rounded-full" style={{ background: ultColor, border: '1px solid #0a0c10' }} />}
          {hasAegis && (
            <div className="absolute top-0 right-0 w-3 h-3 rounded-full flex items-center justify-center"
              style={{ background: '#0a0c10', border: '1px solid rgba(184,212,255,0.45)', fontSize: 7 }}>🛡</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono truncate text-text-primary leading-none">{p.name ?? `Hero ${p.heroId}`}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] font-mono text-text-muted">lv{p.level}</span>
            {p.goldPerMinute > 0 && <span className="text-[9px] font-mono" style={{ color: '#f5c842', opacity: 0.8 }}>{p.goldPerMinute}g</span>}
            {p.numLastHits > 0 && <span className="text-[9px] font-mono text-text-muted opacity-60">{p.numLastHits}cs</span>}
          </div>
        </div>
        <div className="text-right text-[10px] font-mono shrink-0">
          <p className="font-bold leading-none" style={{ color }}>{p.numKills}/{p.numDeaths}/{p.numAssists}</p>
          <p className="text-text-muted mt-0.5">{formatK(p.networth)}</p>
        </div>
        {p.ultimateState === 2 && p.ultimateCooldown > 0 && (
          <span className="text-[9px] font-mono font-bold shrink-0" style={{ color: '#f5c842' }}>{p.ultimateCooldown}s</span>
        )}
      </div>
      {p.items.length > 0 && <ItemSlots itemIds={p.items} itemMap={itemMap} size={22} />}
    </div>
  )
}

// ─── Stats table (finished match) ─────────────────────────────────────────────

const STAT_GRID = '44px 1fr 80px 64px 52px 52px 44px auto'

function StatTableHeader({ color, teamName, won, kills }: {
  color: string; teamName: string; won: boolean; kills: number
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b" style={{ background: `${color}08`, borderColor: `${color}1a` }}>
        <span className="text-[13px] font-mono font-bold" style={{ color }}>{teamName}</span>
        {won && (
          <span className="text-[8px] font-mono font-bold px-2 py-0.5 rounded" style={{ background: `${color}20`, color }}>WIN</span>
        )}
        <div className="flex-1" />
        <span className="text-[10px] font-mono" style={{ color: `${color}88` }}>{kills} kills</span>
      </div>
      <div className="grid items-center px-4 py-1.5 text-[8px] font-mono uppercase tracking-wider border-b border-bg-border/50"
        style={{ gridTemplateColumns: STAT_GRID }}>
        <div className="text-text-muted/40">Hero</div>
        <div className="pl-2 text-text-muted/40">Player</div>
        <div className="text-center text-text-muted/40">K / D / A</div>
        <div className="text-right text-text-muted/40">Net Worth</div>
        <div className="text-right" style={{ color: 'rgba(245,200,66,0.45)' }}>GPM</div>
        <div className="text-right" style={{ color: 'rgba(167,139,250,0.45)' }}>XPM</div>
        <div className="text-right text-text-muted/40">LH</div>
        <div className="pl-2 text-text-muted/40">Items</div>
      </div>
    </>
  )
}

function PlayerRow({ player, isRadiant, itemMap }: { player: DotaMatchPlayer; isRadiant: boolean; itemMap: Record<number, DotaItem> }) {
  const color = isRadiant ? '#00e5a0' : '#ff4f6a'
  return (
    <div className="grid items-center px-4 py-2.5 hover:bg-white/[0.025] transition-colors border-b border-bg-border/25 last:border-0"
      style={{ gridTemplateColumns: STAT_GRID }}>
      <HeroImage heroId={player.heroId} heroImg={player.heroImg} size={44} />
      <div className="pl-2 min-w-0">
        <p className="text-[12px] font-mono font-bold truncate text-text-primary leading-none">{player.name ?? '—'}</p>
        <p className="text-[9px] font-mono truncate text-text-muted mt-0.5 opacity-60">{player.heroName}</p>
      </div>
      <div className="text-center text-[12px] font-mono font-bold" style={{ color }}>
        {player.kills}/{player.deaths}/{player.assists}
      </div>
      <div className="text-right text-[11px] font-mono text-text-secondary">{formatK(player.networth)}</div>
      <div className="text-right text-[11px] font-mono" style={{ color: '#f5c842' }}>{player.gpm}</div>
      <div className="text-right text-[11px] font-mono" style={{ color: '#a78bfa' }}>{player.xpm}</div>
      <div className="text-right text-[11px] font-mono text-text-secondary">{player.lastHits}</div>
      <div className="pl-2">
        <ItemSlots itemIds={player.items ?? []} neutralItemId={player.neutralItem} itemMap={itemMap} size={26} />
      </div>
    </div>
  )
}

// ─── Gold advantage chart ─────────────────────────────────────────────────────

function GoldChart({ leads }: { leads: number[] }) {
  const max = Math.max(...leads.map(Math.abs), 1000)
  const ptArr = leads.map((v, i) => {
    const x = (i / (leads.length - 1)) * 400
    const y = 40 - (v / max) * 37
    return { x: x.toFixed(1), y: y.toFixed(1) }
  })
  const pts = ptArr.map(p => `${p.x},${p.y}`).join(' ')
  const lastVal = leads[leads.length - 1]
  const lineColor = lastVal >= 0 ? '#00e5a0' : '#ff4f6a'
  const first = ptArr[0], last = ptArr[ptArr.length - 1]
  const fillPath = `M ${first.x},${first.y} ${ptArr.slice(1).map(p => `L ${p.x},${p.y}`).join(' ')} L ${last.x},40 L ${first.x},40 Z`

  return (
    <div className="rounded-xl bg-bg-surface border border-bg-border px-4 pt-3 pb-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] font-mono uppercase tracking-wider text-text-muted/60">Gold advantage per minute</p>
        <div className="flex items-center gap-4 text-[9px] font-mono">
          <span style={{ color: '#00e5a0' }}>● Radiant</span>
          <span style={{ color: '#ff4f6a' }}>● Dire</span>
        </div>
      </div>
      <div className="relative" style={{ height: '72px' }}>
        <svg viewBox="0 0 400 80" className="w-full h-full" preserveAspectRatio="none">
          <line x1="0" y1="40" x2="400" y2="40" stroke="rgba(128,128,128,0.15)" strokeWidth="1" strokeDasharray="4 4" />
          <path d={fillPath} fill={lineColor} opacity="0.07" />
          <polyline points={pts} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  )
}

// ─── Live view ────────────────────────────────────────────────────────────────

function LiveView({ matchId, serverSteamId }: { matchId: string; serverSteamId?: string }) {
  const [liveData, setLiveData] = useState<DotaLiveMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [heroes, setHeroes] = useState<Record<number, DotaHero>>({})
  const [itemMap, setItemMap] = useState<Record<number, DotaItem>>({})
  const [showMinimap, setShowMinimap] = useState(true)
  const [elapsed, setElapsed] = useState(0)
  const fetchedAtRef = useRef(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchLive = useCallback(async () => {
    try {
      const data = await api.getDotaLiveMatch(matchId, serverSteamId)
      setLiveData(data)
      fetchedAtRef.current = Date.now()
      setElapsed(0)
    } catch { /* keep previous data */ }
    setLoading(false)
  }, [matchId, serverSteamId])

  useEffect(() => {
    api.getDotaHeroes().then(r => {
      const map: Record<number, DotaHero> = {}
      for (const h of (r.heroes ?? [])) map[h.id] = h
      setHeroes(map)
    }).catch(() => {})
    api.getDotaItems().then(r => {
      const map: Record<number, DotaItem> = {}
      for (const item of (r.items ?? [])) map[item.id] = item
      setItemMap(map)
    }).catch(() => {})
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - fetchedAtRef.current) / 1000))
    }, 1000)
    return () => clearInterval(tick)
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
    const img = p.heroImg ?? heroes[p.heroId]?.img
    if (img) heroImages[p.heroId] = img
  }

  const roshanAlive = (liveData.roshanRespawnTimer ?? 0) === 0
  const roshanMins = liveData.roshanRespawnTimer > 0 ? Math.ceil(liveData.roshanRespawnTimer / 60) : 0

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
          <p className="text-[9px] font-mono mt-0.5 text-text-muted opacity-70">
            {roshanAlive ? 'Rosh alive' : `Rosh ~${roshanMins}m`}
          </p>
        </div>
      </div>

      {/* Gold advantage bar */}
      <div className="px-2 space-y-1">
        <div className="flex justify-between text-[9px] font-mono text-text-muted">
          <span style={{ color: liveData.radiantLead > 0 ? '#00e5a0' : undefined }}>
            Radiant {liveData.radiantLead > 0 ? `+${formatK(liveData.radiantLead)}` : ''}
          </span>
          <span style={{ color: liveData.radiantLead < 0 ? '#ff4f6a' : undefined }}>
            {liveData.radiantLead < 0 ? `+${formatK(Math.abs(liveData.radiantLead))}` : ''} Dire
          </span>
        </div>
        <WinRateBar radiantLead={liveData.radiantLead} />
      </div>

      {/* Minimap */}
      <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
        <div className="flex items-center justify-between px-3 py-2 border-b border-bg-border">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Minimap</span>
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
              radiantTowerState={liveData.radiantTowerState}
              radiantBarracksState={liveData.radiantBarracksState}
              direTowerState={liveData.direTowerState}
              direBarracksState={liveData.direBarracksState}
              heroImages={heroImages}
            />
          </div>
        )}
      </div>

      {/* Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border" style={{ borderColor: 'rgba(0,229,160,0.2)' }}>
          <div className="px-3 py-2 border-b" style={{ background: 'rgba(0,229,160,0.05)', borderColor: 'rgba(0,229,160,0.12)' }}>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: '#00e5a0' }}>
              Radiant · {liveData.radiantScore}K
            </span>
          </div>
          <div className="p-1">
            {radiantPlayers.map((p, i) => (
              <LivePlayerRow key={i} p={p} side="radiant" itemMap={itemMap} elapsed={elapsed} />
            ))}
          </div>
        </div>

        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border" style={{ borderColor: 'rgba(255,79,106,0.2)' }}>
          <div className="px-3 py-2 border-b" style={{ background: 'rgba(255,79,106,0.05)', borderColor: 'rgba(255,79,106,0.12)' }}>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: '#ff4f6a' }}>
              Dire · {liveData.direScore}K
            </span>
          </div>
          <div className="p-1">
            {direPlayers.map((p, i) => (
              <LivePlayerRow key={i} p={p} side="dire" itemMap={itemMap} elapsed={elapsed} />
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
          <div className="p-3">
            <div className="grid grid-cols-2 gap-4">
              {(['radiant', 'dire'] as const).map(side => {
                const isRadiant = side === 'radiant'
                const color = isRadiant ? '#00e5a0' : '#ff4f6a'
                const picks = liveData.pickBans.filter(pb => pb.isPick && pb.isRadiant === isRadiant)
                const bans  = liveData.pickBans.filter(pb => !pb.isPick && pb.isRadiant === isRadiant)
                return (
                  <div key={side}>
                    <p className="text-[9px] font-mono uppercase mb-1.5" style={{ color }}>Picks</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {picks.map((pb, i) => pb.heroImg ? (
                        <div key={i} className="rounded overflow-hidden" style={{ width: 36, height: 21 }}>
                          <img src={pb.heroImg} alt={pb.heroName ?? ''} className="w-full h-full object-cover" draggable={false} />
                        </div>
                      ) : (
                        <div key={i} className="rounded flex items-center justify-center text-[8px] font-mono bg-bg-elevated text-text-muted" style={{ width: 36, height: 21 }}>
                          {pb.heroId ?? '?'}
                        </div>
                      ))}
                    </div>
                    {bans.length > 0 && (
                      <>
                        <p className="text-[9px] font-mono uppercase mb-1.5 text-text-muted">Bans</p>
                        <div className="flex flex-wrap gap-1 opacity-40">
                          {bans.map((pb, i) => pb.heroImg ? (
                            <div key={i} className="rounded overflow-hidden grayscale" style={{ width: 28, height: 16 }}>
                              <img src={pb.heroImg} alt={pb.heroName ?? ''} className="w-full h-full object-cover" draggable={false} />
                            </div>
                          ) : null)}
                        </div>
                      </>
                    )}
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

// ─── Series overview (GRID fallback when Stratz not available) ────────────────

function SeriesOverview({ esports }: { esports: EsportsMatchDetail }) {
  const scoreA = esports.teamA?.score ?? null
  const scoreB = esports.teamB?.score ?? null
  const finished = esports.status === 'finished'
  const winnerA = finished && scoreA !== null && scoreB !== null && scoreA > scoreB
  const winnerB = finished && scoreA !== null && scoreB !== null && scoreB > scoreA

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-bg-border">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted/70">
            {esports.tournament ?? 'Pro Match'}
          </span>
          <span className="text-[10px] font-mono text-text-muted uppercase">
            {esports.format ?? ''} · {esports.status}
          </span>
        </div>
        <div className="flex items-center px-6 py-5">
          <div className="flex-1">
            <p className="text-[17px] font-mono font-bold leading-none"
              style={{ color: winnerA ? '#00e5a0' : 'rgba(255,255,255,0.55)' }}>
              {esports.teamA?.name ?? 'Team A'}
            </p>
            {finished && <p className="text-[9px] font-mono mt-1.5 tracking-widest uppercase"
              style={{ color: winnerA ? '#00e5a099' : 'rgba(255,255,255,0.22)' }}>
              {winnerA ? 'WINNER' : 'DEFEAT'}
            </p>}
          </div>
          <div className="flex items-center gap-3 shrink-0 px-8">
            {scoreA !== null && scoreB !== null ? (
              <>
                <span className="text-[44px] font-mono font-bold leading-none"
                  style={{ color: winnerA ? '#00e5a0' : 'rgba(255,255,255,0.28)', letterSpacing: '-2px' }}>{scoreA}</span>
                <span className="text-[28px] font-mono leading-none" style={{ color: 'rgba(255,255,255,0.18)' }}>:</span>
                <span className="text-[44px] font-mono font-bold leading-none"
                  style={{ color: winnerB ? '#ff4f6a' : 'rgba(255,255,255,0.28)', letterSpacing: '-2px' }}>{scoreB}</span>
              </>
            ) : (
              <span className="text-[28px] font-mono leading-none text-text-muted">vs</span>
            )}
          </div>
          <div className="flex-1 text-right">
            <p className="text-[17px] font-mono font-bold leading-none"
              style={{ color: winnerB ? '#ff4f6a' : 'rgba(255,255,255,0.55)' }}>
              {esports.teamB?.name ?? 'Team B'}
            </p>
            {finished && <p className="text-[9px] font-mono mt-1.5 tracking-widest uppercase"
              style={{ color: winnerB ? '#ff4f6a99' : 'rgba(255,255,255,0.22)' }}>
              {winnerB ? 'WINNER' : 'DEFEAT'}
            </p>}
          </div>
        </div>
      </div>

      {esports.games.length > 0 && (
        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
          <div className="px-5 py-2.5 border-b border-bg-border">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted/60">Games</span>
          </div>
          <div className="divide-y divide-bg-border/50">
            {esports.games.map((g, i) => {
              const wonA = g.teamA?.won === true
              const wonB = g.teamB?.won === true
              return (
                <div key={i} className="flex items-center px-5 py-3 gap-4">
                  <span className="text-[9px] font-mono text-text-muted/40 w-10">MAP {g.seq}</span>
                  <span className="text-[11px] font-mono font-bold flex-1"
                    style={{ color: wonA ? '#00e5a0' : 'rgba(255,255,255,0.45)' }}>
                    {esports.teamA?.name}
                  </span>
                  <span className="text-[10px] font-mono text-text-muted mx-2">
                    {g.finished ? 'FIN' : g.started ? 'LIVE' : '—'}
                  </span>
                  <span className="text-[11px] font-mono font-bold flex-1 text-right"
                    style={{ color: wonB ? '#ff4f6a' : 'rgba(255,255,255,0.45)' }}>
                    {esports.teamB?.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="text-center py-3">
        <p className="text-[10px] font-mono text-text-muted/40">Detailed player stats not available for this match</p>
      </div>
    </div>
  )
}

// ─── Finished match view ──────────────────────────────────────────────────────

function FinishedView({ matchId }: { matchId: string }) {
  const [data, setData] = useState<DotaMatchDetail | null>(null)
  const [esportsData, setEsportsData] = useState<EsportsMatchDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [itemMap, setItemMap] = useState<Record<number, DotaItem>>({})

  useEffect(() => {
    async function load() {
      // Try direct Stratz/OpenDota match lookup
      let dotaMatch: DotaMatchDetail | null = null
      try { dotaMatch = await api.getDotaMatch(matchId) } catch {}

      if (!dotaMatch) {
        // Fallback: treat matchId as GRID series ID
        let esports: EsportsMatchDetail | null = null
        try { esports = await api.getEsportsMatch(matchId) } catch {}

        if (esports) {
          // If steamData has completed games with real Dota 2 match IDs, try Stratz for those
          type SteamGame = { matchId: number; isLive?: boolean }
          const steamGames = (esports.steamData?.games ?? []) as SteamGame[]
          const lastDone = [...steamGames].filter(g => !g.isLive).pop()
          if (lastDone?.matchId) {
            try { dotaMatch = await api.getDotaMatch(String(lastDone.matchId)) } catch {}
          }
          if (!dotaMatch) setEsportsData(esports)
        }
      }

      if (dotaMatch) setData(dotaMatch)
      setLoading(false)
    }

    load()
    api.getDotaItems().then(r => {
      const map: Record<number, DotaItem> = {}
      for (const item of (r.items ?? [])) map[item.id] = item
      setItemMap(map)
    }).catch(() => {})
  }, [matchId])

  if (loading) return <div className="animate-pulse rounded-xl h-64 bg-bg-surface border border-bg-border" />
  if (!data && esportsData) return <SeriesOverview esports={esportsData} />
  if (!data) return <div className="text-center py-12"><p className="text-sm font-mono text-text-muted">Match data not available</p></div>

  const radiantPlayers = data.players.filter(p => p.isRadiant)
  const direPlayers = data.players.filter(p => !p.isRadiant)
  const radiantKills = radiantPlayers.reduce((s, p) => s + p.kills, 0)
  const direKills = direPlayers.reduce((s, p) => s + p.kills, 0)
  const radiantName = data.radiantTeam?.name ?? 'Radiant'
  const direName = data.direTeam?.name ?? 'Dire'

  const teams = [
    { teamName: radiantName, players: radiantPlayers, color: '#00e5a0', won: data.didRadiantWin === true, isRadiant: true, kills: radiantKills },
    { teamName: direName, players: direPlayers, color: '#ff4f6a', won: data.didRadiantWin === false, isRadiant: false, kills: direKills },
  ]

  return (
    <div className="space-y-3">
      {/* ── Match header ── */}
      <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
        {/* League + duration */}
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-bg-border">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted/70">
            {data.leagueName ?? 'Pro Match'}
          </span>
          {data.duration && (
            <span className="text-[10px] font-mono text-text-muted">{formatTime(data.duration)}</span>
          )}
        </div>

        {/* Teams + score */}
        <div className="flex items-center px-6 py-5">
          {/* Radiant */}
          <div className="flex-1 flex items-center gap-3">
            {data.radiantTeam?.logo && (
              <img src={data.radiantTeam.logo} alt="" className="w-10 h-10 object-contain shrink-0" draggable={false} />
            )}
            <div>
              <p className="text-[17px] font-mono font-bold leading-none"
                style={{ color: data.didRadiantWin ? '#00e5a0' : 'rgba(255,255,255,0.55)' }}>
                {radiantName}
              </p>
              <p className="text-[9px] font-mono mt-1.5 tracking-widest uppercase"
                style={{ color: data.didRadiantWin ? '#00e5a099' : 'rgba(255,255,255,0.22)' }}>
                {data.didRadiantWin ? 'WINNER' : 'DEFEAT'}
              </p>
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-3 shrink-0 px-8">
            <span className="text-[44px] font-mono font-bold leading-none"
              style={{ color: data.didRadiantWin ? '#00e5a0' : 'rgba(255,255,255,0.28)', letterSpacing: '-2px' }}>
              {radiantKills}
            </span>
            <span className="text-[28px] font-mono leading-none" style={{ color: 'rgba(255,255,255,0.18)' }}>:</span>
            <span className="text-[44px] font-mono font-bold leading-none"
              style={{ color: !data.didRadiantWin ? '#ff4f6a' : 'rgba(255,255,255,0.28)', letterSpacing: '-2px' }}>
              {direKills}
            </span>
          </div>

          {/* Dire */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="text-right">
              <p className="text-[17px] font-mono font-bold leading-none"
                style={{ color: !data.didRadiantWin ? '#ff4f6a' : 'rgba(255,255,255,0.55)' }}>
                {direName}
              </p>
              <p className="text-[9px] font-mono mt-1.5 tracking-widest uppercase"
                style={{ color: !data.didRadiantWin ? '#ff4f6a99' : 'rgba(255,255,255,0.22)' }}>
                {!data.didRadiantWin ? 'WINNER' : 'DEFEAT'}
              </p>
            </div>
            {data.direTeam?.logo && (
              <img src={data.direTeam.logo} alt="" className="w-10 h-10 object-contain shrink-0" draggable={false} />
            )}
          </div>
        </div>
      </div>

      {/* ── Gold advantage chart ── */}
      {data.radiantNetworthLeads && data.radiantNetworthLeads.length > 1 && (
        <GoldChart leads={data.radiantNetworthLeads} />
      )}

      {/* ── Player tables ── */}
      {teams.map(({ teamName, players, color, won, isRadiant, kills }) => (
        <div key={teamName} className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border"
          style={{ borderColor: `${color}20` }}>
          <StatTableHeader color={color} teamName={teamName} won={won} kills={kills} />
          <div>
            {players.map((p, i) => (
              <PlayerRow key={i} player={p} isRadiant={isRadiant} itemMap={itemMap} />
            ))}
          </div>
        </div>
      ))}

      {/* ── Draft ── */}
      {data.pickBans.length > 0 && (
        <div className="rounded-xl overflow-hidden bg-bg-surface border border-bg-border">
          <div className="px-4 py-2.5 border-b border-bg-border">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">Draft</span>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-8">
              {(['radiant', 'dire'] as const).map(side => {
                const isRadiant = side === 'radiant'
                const picks = data.pickBans.filter(pb => pb.isPick && pb.isRadiant === isRadiant)
                const bans  = data.pickBans.filter(pb => !pb.isPick && pb.isRadiant === isRadiant)
                const color = isRadiant ? '#00e5a0' : '#ff4f6a'
                const label = isRadiant ? radiantName : direName
                return (
                  <div key={side}>
                    <p className="text-[11px] font-mono font-bold mb-3" style={{ color }}>{label}</p>
                    <p className="text-[8px] font-mono uppercase tracking-wider mb-2 text-text-muted/50">Picks</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {picks.map((pb, i) => pb.heroImg ? (
                        <div key={i} title={pb.heroName ?? ''} className="rounded overflow-hidden" style={{ width: 52, height: 29 }}>
                          <img src={pb.heroImg} alt={pb.heroName ?? ''} className="w-full h-full object-cover" draggable={false} />
                        </div>
                      ) : null)}
                    </div>
                    {bans.length > 0 && (
                      <>
                        <p className="text-[8px] font-mono uppercase tracking-wider mb-2 text-text-muted/50">Bans</p>
                        <div className="flex flex-wrap gap-1 opacity-30">
                          {bans.map((pb, i) => pb.heroImg ? (
                            <div key={i} title={pb.heroName ?? ''} className="rounded overflow-hidden grayscale" style={{ width: 38, height: 22 }}>
                              <img src={pb.heroImg} alt={pb.heroName ?? ''} className="w-full h-full object-cover" draggable={false} />
                            </div>
                          ) : null)}
                        </div>
                      </>
                    )}
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
  onBack?: () => void
}

export default function DotaMatchScreen({ matchId, onBack }: Props) {
  usePageTitle(`Match ${matchId}`)
  const router = useRouter()
  const searchParams = useSearchParams()
  const serverSteamId = searchParams?.get('server_steam_id') ?? undefined

  const [isLive, setIsLive] = useState(!!serverSteamId)

  return (
    <div className="py-5 text-text-primary">
      {/* Back */}
      <button
        onClick={() => onBack ? onBack() : router.back()}
        className="flex items-center gap-1.5 text-[11px] font-mono mb-5 text-text-muted hover:text-text-secondary transition-colors"
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        BACK
      </button>

      {/* Tabs */}
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
