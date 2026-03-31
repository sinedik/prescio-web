'use client'
import { useMemo } from 'react'
import type { DotaLivePlayer, DotaBuildingState } from '../../types/dota'

interface Props {
  players: DotaLivePlayer[]
  buildingState?: DotaBuildingState | null
  heroImages: Record<number, string>
  className?: string
}

// Tower positions on the 0-100 normalised map
// Approximate positions mirrored from the actual Dota 2 minimap
const TOWERS = {
  radiant: {
    t1: [
      { x: 73, y: 78 }, // bot t1
      { x: 50, y: 63 }, // mid t1
      { x: 25, y: 38 }, // top t1
    ],
    t2: [
      { x: 68, y: 68 }, // bot t2
      { x: 46, y: 56 }, // mid t2
      { x: 30, y: 32 }, // top t2
    ],
  },
  dire: {
    t1: [
      { x: 26, y: 21 }, // top t1
      { x: 50, y: 36 }, // mid t1
      { x: 74, y: 56 }, // bot t1
    ],
    t2: [
      { x: 30, y: 28 }, // top t2
      { x: 54, y: 43 }, // mid t2
      { x: 70, y: 62 }, // bot t2
    ],
  },
}

function formatTime(secs: number): string {
  const m = Math.floor(Math.abs(secs) / 60)
  const s = Math.abs(secs) % 60
  return `${secs < 0 ? '-' : ''}${m}:${String(s).padStart(2, '0')}`
}

export default function DotaMinimap({ players, buildingState, heroImages, className = '' }: Props) {
  const radiantPlayers = useMemo(() => players.filter(p => p.isRadiant && p.posX != null), [players])
  const direPlayers = useMemo(() => players.filter(p => !p.isRadiant && p.posX != null), [players])
  const hasPositions = radiantPlayers.length > 0 || direPlayers.length > 0

  return (
    <div className={`relative select-none ${className}`} style={{ aspectRatio: '1 / 1' }}>
      {/* Map background */}
      <img
        src="https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/minimap/minimap.png"
        alt="Dota 2 minimap"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        onError={(e) => {
          // fallback — dark background
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />
      {/* Dark overlay so markers stand out */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Tower indicators */}
      {buildingState && (
        <>
          {(['radiant', 'dire'] as const).map(side => (
            (['t1', 't2'] as const).map(tier =>
              TOWERS[side][tier].map((pos, i) => {
                const alive = buildingState[side][tier][i]
                const color = side === 'radiant' ? '#00e5a0' : '#ff4f6a'
                return (
                  <div
                    key={`${side}-${tier}-${i}`}
                    className="absolute"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div
                      className="rounded-sm"
                      style={{
                        width: '7px',
                        height: '7px',
                        backgroundColor: alive ? color : 'rgba(100,100,100,0.4)',
                        opacity: alive ? 0.85 : 0.4,
                        border: `1px solid ${alive ? color : '#555'}`,
                        boxShadow: alive ? `0 0 4px ${color}` : 'none',
                      }}
                    />
                  </div>
                )
              })
            )
          ))}
        </>
      )}

      {/* Player dots */}
      {hasPositions ? (
        <>
          {players.map((p, i) => {
            if (p.posX == null || p.posY == null) return null
            const color = p.isRadiant ? '#00e5a0' : '#ff4f6a'
            const img = heroImages[p.heroId]
            const isDead = p.respawnTimer > 0

            return (
              <div
                key={`${p.steamAccountId}-${i}`}
                className="absolute"
                style={{
                  left: `${p.posX}%`,
                  top: `${p.posY}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                }}
                title={`${p.name ?? `Hero ${p.heroId}`} | K/D/A: ${p.numKills}/${p.numDeaths}/${p.numAssists} | NW: ${(p.networth / 1000).toFixed(1)}k`}
              >
                {img ? (
                  <div
                    className="rounded-full overflow-hidden"
                    style={{
                      width: '22px',
                      height: '22px',
                      border: `2px solid ${isDead ? '#555' : color}`,
                      opacity: isDead ? 0.45 : 1,
                      boxShadow: isDead ? 'none' : `0 0 5px ${color}88`,
                    }}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </div>
                ) : (
                  <div
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: '18px',
                      height: '18px',
                      backgroundColor: isDead ? '#333' : color,
                      opacity: isDead ? 0.45 : 0.9,
                      border: `1px solid ${isDead ? '#555' : 'rgba(255,255,255,0.3)'}`,
                    }}
                  />
                )}
                {/* Respawn timer */}
                {isDead && (
                  <div
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-center font-mono font-bold"
                    style={{ fontSize: '8px', color: '#ff4f6a', whiteSpace: 'nowrap' }}
                  >
                    {p.respawnTimer}s
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-[10px] font-mono text-text-muted opacity-50">NO POSITION DATA</p>
        </div>
      )}
    </div>
  )
}
