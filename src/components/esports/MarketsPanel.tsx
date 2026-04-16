import type { EsportsMarket } from '../../types'

interface TeamLite {
  name?: string | null
  colorPrimary?: string | null
}

interface Props {
  markets: EsportsMarket[]
  teamA?: TeamLite
  teamB?: TeamLite
  accent: string
}

export default function MarketsPanel({ markets, teamA, teamB, accent }: Props) {
  if (!markets || markets.length === 0) return null

  const aColor = teamA?.colorPrimary ?? accent
  const aName  = teamA?.name ?? '—'
  const bName  = teamB?.name ?? '—'

  const rendered = markets.map((m) => {
    if (m.type === 'MATCH_WINNER') {
      const pct = Math.round(m.yesPrice * 100)
      if (!pct || m.yesPrice === 0.5) return null
      return (
        <MarketCard key={m.id} label="Match winner">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono text-text-primary w-24 truncate">{aName}</span>
            <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: aColor }} />
            </div>
            <span className="text-[11px] font-mono text-text-primary w-24 truncate text-right">{bName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[11px] font-mono font-bold" style={{ color: aColor }}>{pct}%</span>
            <span className="text-[11px] font-mono font-bold text-text-muted">{100 - pct}%</span>
          </div>
        </MarketCard>
      )
    }

    if (m.type === 'TOTAL_MAPS') {
      const pct = Math.round(m.yesPrice * 100)
      if (!pct || pct === 50) return null
      return (
        <MarketCard key={m.id} label={m.question ?? 'Total maps'}>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: accent }} />
            </div>
            <span className="text-[11px] font-mono font-bold shrink-0" style={{ color: accent }}>YES {pct}%</span>
            <span className="text-[11px] font-mono font-bold text-text-muted shrink-0">NO {100 - pct}%</span>
          </div>
        </MarketCard>
      )
    }

    if (m.type === 'MAP_WINNER') {
      const mapLabel = m.mapNumber ? `Map ${m.mapNumber} winner` : (m.question ?? 'Map winner')
      if (m.status === 'resolved') {
        const winner = m.yesPrice === 1 ? aName : bName
        return (
          <div key={m.id} className="bg-bg-surface border border-bg-border rounded-lg px-4 py-3 flex items-center justify-between">
            <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">{mapLabel}</p>
            <span className="text-[11px] font-mono font-bold" style={{ color: accent }}>{winner}</span>
          </div>
        )
      }
      const pct = Math.round(m.yesPrice * 100)
      if (!pct || pct === 50) return null
      return (
        <MarketCard key={m.id} label={mapLabel}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-text-muted/70 w-20 truncate">{aName}</span>
            <div className="flex-1 h-2 rounded-full bg-bg-elevated overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: accent }} />
            </div>
            <span className="text-[10px] font-mono text-text-muted/70 w-20 truncate text-right">{bName}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[11px] font-mono font-bold" style={{ color: accent }}>{pct}%</span>
            <span className="text-[11px] font-mono font-bold text-text-muted">{100 - pct}%</span>
          </div>
        </MarketCard>
      )
    }

    return null
  })

  const visible = rendered.filter(Boolean)

  return (
    <section className="flex flex-col gap-2">
      <header className="flex items-baseline justify-between px-1">
        <h3 className="text-[11px] font-mono font-bold tracking-widest uppercase" style={{ color: accent }}>
          Prescio Fair Price
        </h3>
        <span className="text-[9px] font-mono text-text-muted/70 uppercase tracking-wider">
          Internal probability · not a betting market
        </span>
      </header>

      {visible.length > 0 ? (
        <div className="flex flex-col gap-2">{visible}</div>
      ) : (
        <div className="rounded-lg border border-bg-border/60 bg-bg-surface/50 px-4 py-3">
          <p className="text-[10px] font-mono text-text-muted/70">
            All Prescio prices are at 50/50 — no signal yet.
          </p>
        </div>
      )}
    </section>
  )
}

function MarketCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
      <p className="text-[10px] font-mono text-text-muted mb-2 uppercase tracking-wider">{label}</p>
      {children}
    </div>
  )
}
