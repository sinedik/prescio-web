'use client'
import { useMemo } from 'react'
import type { DotaLivePlayer } from '../../types/dota'

interface Props {
  players: DotaLivePlayer[]
  radiantTowerState?: number
  radiantBarracksState?: number
  direTowerState?: number
  direBarracksState?: number
  heroImages: Record<number, string>
  className?: string
}

// ─── Building table ───────────────────────────────────────────────────────────
// xPct / yPct — 0-100%, calibrated from the Dota 2 minimap texture
// tower_state bits (per-side): 0-2=T3(top/mid/bot), 3-5=T2, 6-8=T1, 9-10=T4
// barracks_state bits: 0=top_melee, 1=top_range, 2=mid_melee, 3=mid_range, 4=bot_melee, 5=bot_range

interface Building {
  xPct: number; yPct: number
  side: 'radiant' | 'dire'
  type: 'tower' | 'barrack' | 'throne'
  tier?: number
  bit?: number
}

const BUILDINGS: Building[] = [
  // ── RADIANT ────────────────────────────────────────────────────────────────
  { xPct: 10.8, yPct: 85.4, side: 'radiant', type: 'throne' },
  // T4
  { xPct: 11.7, yPct: 80.5, side: 'radiant', type: 'tower', tier: 4, bit: 9 },
  { xPct: 15.8, yPct: 83.9, side: 'radiant', type: 'tower', tier: 4, bit: 10 },
  // T3 (bits 0, 1, 2)
  { xPct:  9.6, yPct: 69.3, side: 'radiant', type: 'tower', tier: 3, bit: 0 },
  { xPct: 23.1, yPct: 73.8, side: 'radiant', type: 'tower', tier: 3, bit: 1 },
  { xPct: 27.1, yPct: 87.5, side: 'radiant', type: 'tower', tier: 3, bit: 2 },
  // T2 (bits 3, 4, 5)
  { xPct: 10.4, yPct: 52.3, side: 'radiant', type: 'tower', tier: 2, bit: 3 },
  { xPct: 32.3, yPct: 64.6, side: 'radiant', type: 'tower', tier: 2, bit: 4 },
  { xPct: 46.0, yPct: 87.5, side: 'radiant', type: 'tower', tier: 2, bit: 5 },
  // T1 (bits 6, 7, 8)
  { xPct: 11.2, yPct: 37.4, side: 'radiant', type: 'tower', tier: 1, bit: 6 },
  { xPct: 41.4, yPct: 56.1, side: 'radiant', type: 'tower', tier: 1, bit: 7 },
  { xPct: 76.3, yPct: 87.5, side: 'radiant', type: 'tower', tier: 1, bit: 8 },
  // Barracks
  { xPct: 12.1, yPct: 72.8, side: 'radiant', type: 'barrack', bit: 0 },
  { xPct:  7.1, yPct: 73.0, side: 'radiant', type: 'barrack', bit: 1 },
  { xPct: 19.2, yPct: 75.1, side: 'radiant', type: 'barrack', bit: 2 },
  { xPct: 22.3, yPct: 78.7, side: 'radiant', type: 'barrack', bit: 3 },
  { xPct: 23.6, yPct: 85.4, side: 'radiant', type: 'barrack', bit: 4 },
  { xPct: 23.6, yPct: 90.0, side: 'radiant', type: 'barrack', bit: 5 },

  // ── DIRE ───────────────────────────────────────────────────────────────────
  { xPct: 85.6, yPct: 15.7, side: 'dire', type: 'throne' },
  // T4
  { xPct: 80.6, yPct: 17.8, side: 'dire', type: 'tower', tier: 4, bit: 9 },
  { xPct: 84.4, yPct: 20.9, side: 'dire', type: 'tower', tier: 4, bit: 10 },
  // T3 (bits 0, 1, 2)
  { xPct: 87.7, yPct: 33.9, side: 'dire', type: 'tower', tier: 3, bit: 0 },
  { xPct: 74.4, yPct: 28.2, side: 'dire', type: 'tower', tier: 3, bit: 1 },
  { xPct: 67.7, yPct: 14.9, side: 'dire', type: 'tower', tier: 3, bit: 2 },
  // T2 (bits 3, 4, 5)
  { xPct: 86.9, yPct: 48.3, side: 'dire', type: 'tower', tier: 2, bit: 3 },
  { xPct: 65.0, yPct: 36.8, side: 'dire', type: 'tower', tier: 2, bit: 4 },
  { xPct: 51.1, yPct: 14.2, side: 'dire', type: 'tower', tier: 2, bit: 5 },
  // T1 (bits 6, 7, 8)
  { xPct: 86.3, yPct: 62.8, side: 'dire', type: 'tower', tier: 1, bit: 6 },
  { xPct: 52.7, yPct: 46.2, side: 'dire', type: 'tower', tier: 1, bit: 7 },
  { xPct: 22.3, yPct: 13.8, side: 'dire', type: 'tower', tier: 1, bit: 8 },
  // Barracks
  { xPct: 85.4, yPct: 30.5, side: 'dire', type: 'barrack', bit: 0 },
  { xPct: 90.4, yPct: 30.8, side: 'dire', type: 'barrack', bit: 1 },
  { xPct: 73.7, yPct: 23.6, side: 'dire', type: 'barrack', bit: 2 },
  { xPct: 78.1, yPct: 25.9, side: 'dire', type: 'barrack', bit: 3 },
  { xPct: 71.9, yPct: 12.5, side: 'dire', type: 'barrack', bit: 4 },
  { xPct: 71.9, yPct: 17.2, side: 'dire', type: 'barrack', bit: 5 },
]

function isBuildingAlive(b: Building, radiantTS: number, radiantBS: number, direTS: number, direBS: number): boolean {
  if (b.bit === undefined) return true // throne — always "alive" until game ends
  const mask = b.side === 'radiant'
    ? (b.type === 'tower' ? radiantTS : radiantBS)
    : (b.type === 'tower' ? direTS : direBS)
  return Boolean(mask & (1 << b.bit))
}

export default function DotaMinimap({
  players,
  radiantTowerState = 2047,
  radiantBarracksState = 63,
  direTowerState = 2047,
  direBarracksState = 63,
  heroImages,
  className = '',
}: Props) {
  const playersWithPos = useMemo(() => players.filter(p => p.posX != null && p.posY != null), [players])

  return (
    <div className={`relative select-none ${className}`} style={{ aspectRatio: '1 / 1' }}>
      {/* Map background */}
      <img
        src="https://cyberscore.live/images/map-texture.webp"
        alt="Dota 2 minimap"
        className="absolute inset-0 w-full h-full object-cover rounded"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/10 rounded" />

      {/* Buildings */}
      {BUILDINGS.map((b, i) => {
        const alive = isBuildingAlive(b, radiantTowerState, radiantBarracksState, direTowerState, direBarracksState)
        const color = b.side === 'radiant' ? '#00e5a0' : '#ff4f6a'

        if (b.type === 'throne') {
          return (
            <div key={i} className="absolute" style={{ left: `${b.xPct}%`, top: `${b.yPct}%`, transform: 'translate(-50%,-50%)' }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, opacity: 0.9, boxShadow: `0 0 6px ${color}` }} />
            </div>
          )
        }

        if (b.type === 'tower') {
          const sz = b.tier === 3 ? 7 : b.tier === 4 ? 6 : 6
          return (
            <div key={i} className="absolute" style={{ left: `${b.xPct}%`, top: `${b.yPct}%`, transform: 'translate(-50%,-50%)' }}>
              <div style={{
                width: sz, height: sz, borderRadius: '50%',
                background: alive ? color : 'rgba(80,80,80,0.5)',
                opacity: alive ? 0.85 : 0.35,
                border: `1px solid ${alive ? color : '#444'}`,
                boxShadow: alive ? `0 0 4px ${color}` : 'none',
              }} />
            </div>
          )
        }

        // Barracks
        return (
          <div key={i} className="absolute" style={{ left: `${b.xPct}%`, top: `${b.yPct}%`, transform: 'translate(-50%,-50%)' }}>
            <div style={{
              width: 4, height: 4, borderRadius: 1,
              background: alive ? color : 'rgba(80,80,80,0.5)',
              opacity: alive ? 0.8 : 0.3,
            }} />
          </div>
        )
      })}

      {/* Hero dots */}
      {playersWithPos.map((p, i) => {
        const color = p.isRadiant ? '#00e5a0' : '#ff4f6a'
        const img = heroImages[p.heroId]
        const isDead = p.respawnTimer > 0

        return (
          <div
            key={`${p.steamAccountId}-${i}`}
            className="absolute"
            style={{ left: `${p.posX}%`, top: `${p.posY}%`, transform: 'translate(-50%,-50%)', zIndex: 10 }}
            title={`${p.name ?? `Hero ${p.heroId}`} | ${p.numKills}/${p.numDeaths}/${p.numAssists} | ${(p.networth / 1000).toFixed(1)}k`}
          >
            {img ? (
              <div className="rounded-full overflow-hidden" style={{
                width: 22, height: 22,
                border: `2px solid ${isDead ? '#555' : color}`,
                opacity: isDead ? 0.4 : 1,
                boxShadow: isDead ? 'none' : `0 0 5px ${color}88`,
              }}>
                <img src={img} alt="" className="w-full h-full object-cover" draggable={false} />
              </div>
            ) : (
              <div className="rounded-full" style={{
                width: 18, height: 18,
                background: isDead ? '#333' : color,
                opacity: isDead ? 0.4 : 0.9,
                border: `1px solid ${isDead ? '#555' : 'rgba(255,255,255,0.3)'}`,
              }} />
            )}
            {isDead && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 font-mono font-bold text-center"
                style={{ fontSize: 8, color: '#ff4f6a', whiteSpace: 'nowrap' }}>
                {p.respawnTimer}s
              </div>
            )}
          </div>
        )
      })}

      {playersWithPos.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[10px] font-mono text-text-muted opacity-50">NO POSITION DATA</p>
        </div>
      )}
    </div>
  )
}
