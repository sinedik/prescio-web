import { useState, useMemo, useEffect } from 'react'
import { usePortfolio, calcPortfolioStats, calcPositionPnl } from '../hooks/usePortfolio'
import PositionCard from '../components/PositionCard'
import AddPositionModal from '../components/AddPositionModal'
import PaywallModal from '../components/PaywallModal'
import { useAuthContext } from '../contexts/AuthContext'
import { daysUntil } from '../utils'
import { api } from '../lib/api'
import type { Position, PositionStatus } from '../types'

type FilterStatus = PositionStatus | 'all'

const STATUS_FILTERS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'open', label: 'OPEN' },
  { value: 'won', label: 'WON' },
  { value: 'lost', label: 'LOST' },
]

// ---- SVG P&L Chart ----
function PnlChart({ positions }: { positions: Position[] }) {
  const closed = useMemo(() =>
    positions
      .filter((p) => p.status !== 'open' && p.closedAt)
      .sort((a, b) => new Date(a.closedAt!).getTime() - new Date(b.closedAt!).getTime()),
    [positions]
  )

  if (closed.length < 2) return null

  let cumulative = 0
  const data = closed.map((p) => {
    const { resolvedPnl } = calcPositionPnl(p)
    cumulative += resolvedPnl ?? 0
    return { label: new Date(p.closedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), pnl: cumulative }
  })

  const W = 400, H = 80, padX = 10, padTop = 8, padBot = 4
  const iW = W - padX * 2
  const iH = H - padTop - padBot
  const pnls = data.map((d) => d.pnl)
  const rawMin = Math.min(0, ...pnls)
  const rawMax = Math.max(0, ...pnls)
  const range = rawMax - rawMin || 1
  const toX = (i: number) => padX + (i / (data.length - 1)) * iW
  const toY = (p: number) => padTop + iH - ((p - rawMin) / range) * iH
  const zeroY = toY(0)
  const lastPnl = pnls[pnls.length - 1]
  const lineColor = lastPnl >= 0 ? 'rgb(var(--accent))' : 'rgb(var(--danger))'
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(d.pnl).toFixed(1)}`).join(' ')

  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-mono font-bold text-text-muted tracking-widest">P&amp;L HISTORY</h2>
        <span className={`text-sm font-mono font-bold ${lastPnl >= 0 ? 'text-accent' : 'text-danger'}`}>
          {lastPnl >= 0 ? '+' : ''}${lastPnl.toFixed(0)}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: '80px' }} preserveAspectRatio="none">
        {/* Zero line */}
        <line x1={padX} y1={zeroY.toFixed(1)} x2={W - padX} y2={zeroY.toFixed(1)}
          stroke="rgb(var(--bg-border))" strokeWidth="0.8" strokeDasharray="4 3" />
        {/* Line */}
        <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.5" strokeLinejoin="round" />
        {/* End dot */}
        <circle cx={toX(data.length - 1)} cy={toY(lastPnl)} r="3" fill={lineColor} />
      </svg>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] font-mono text-text-muted">{data[0].label}</span>
        <span className="text-[9px] font-mono text-text-muted">{data[data.length - 1].label}</span>
      </div>
    </div>
  )
}

// ---- SVG Donut Chart ----
function AllocationDonut({ positions }: { positions: Position[] }) {
  const open = positions.filter((p) => p.status === 'open')
  if (open.length === 0) return null

  const byPlatform = open.reduce<Record<string, number>>((acc, p) => {
    acc[p.platform] = (acc[p.platform] ?? 0) + p.amount
    return acc
  }, {})
  const total = Object.values(byPlatform).reduce((s, v) => s + v, 0)
  if (total === 0) return null

  const entries = Object.entries(byPlatform).sort((a, b) => b[1] - a[1])
  const COLORS = ['rgb(var(--poly))', 'rgb(var(--kalshi))', 'rgb(var(--metaculus))', 'rgb(var(--accent))', 'rgb(var(--watch))']

  const R = 38, cx = 48, cy = 48, innerR = 24
  let angle = -Math.PI / 2
  const slices = entries.map(([name, value], i) => {
    const frac = value / total
    const start = angle
    angle += frac * Math.PI * 2
    const end = angle
    const largeArc = frac > 0.5 ? 1 : 0
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start)
    const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end)
    const ix1 = cx + innerR * Math.cos(end), iy1 = cy + innerR * Math.sin(end)
    const ix2 = cx + innerR * Math.cos(start), iy2 = cy + innerR * Math.sin(start)
    const path = `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} L ${ix1.toFixed(1)} ${iy1.toFixed(1)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2.toFixed(1)} ${iy2.toFixed(1)} Z`
    return { name, value, color: COLORS[i % COLORS.length], path }
  })

  return (
    <div className="bg-bg-surface border border-bg-border rounded-lg p-4 mb-4">
      <h2 className="text-xs font-mono font-bold text-text-muted tracking-widest mb-3">ALLOCATION</h2>
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 96 96" className="w-24 h-24 shrink-0">
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} />
          ))}
          <text x="48" y="52" textAnchor="middle" fontSize="9" fill="rgb(var(--text-muted))" fontFamily="monospace">
            ${total.toFixed(0)}
          </text>
        </svg>
        <div className="space-y-1.5 flex-1 min-w-0">
          {slices.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-mono">
              <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
              <span className="text-text-secondary truncate">{s.name}</span>
              <span className="text-text-muted ml-auto shrink-0">${s.value.toFixed(0)}</span>
              <span className="text-text-muted shrink-0">{((s.value / total) * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ---- Resolution Reminders ----
function ResolutionReminders({ positions }: { positions: Position[] }) {
  const urgent = positions
    .filter((p) => p.status === 'open' && p.resolutionDate)
    .map((p) => ({ ...p, days: daysUntil(p.resolutionDate!) }))
    .filter((p) => p.days !== null && p.days <= 7)
    .sort((a, b) => (a.days ?? 99) - (b.days ?? 99))

  if (urgent.length === 0) return null

  return (
    <div className="mb-4">
      <h2 className="text-xs font-mono font-bold text-text-muted tracking-widest mb-2">RESOLVING SOON</h2>
      <div className="space-y-1.5">
        {urgent.map((p) => {
          const isUrgent = (p.days ?? 0) <= 1
          return (
            <div
              key={p.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded border ${
                isUrgent
                  ? 'border-danger/30 bg-danger/5'
                  : 'border-watch/25 bg-watch/5'
              }`}
            >
              <span className={`text-[10px] font-mono font-bold w-8 shrink-0 ${isUrgent ? 'text-danger' : 'text-watch'}`}>
                {(p.days ?? 0) <= 0 ? 'NOW' : `${p.days}D`}
              </span>
              <p className="text-xs font-mono text-text-secondary truncate flex-1">{p.question}</p>
              <span className="text-[10px] font-mono text-text-muted shrink-0">${p.amount}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function PortfolioPage() {
  const { isPro, isAlpha } = useAuthContext()
  const [showPaywall, setShowPaywall] = useState(false)
  const [paywallVariant, setPaywallVariant] = useState<'pro' | 'alpha'>('pro')
  const [aiAccuracy, setAiAccuracy] = useState<{ accuracy: number; total: number } | null>(null)

  const { positions, addPosition, updateStatus, deletePosition, synced } = usePortfolio()
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'edge'>('date')

  const atPositionLimit = !isPro && positions.length >= 5

  const stats = useMemo(() => calcPortfolioStats(positions), [positions])

  useEffect(() => {
    if (!isAlpha) return
    api.getAccuracy().then(setAiAccuracy).catch(() => { /* optional */ })
  }, [isAlpha])

  const filtered = useMemo(() => {
    return positions
      .filter((p) => filter === 'all' || p.status === filter)
      .sort((a, b) => {
        if (sortBy === 'amount') return b.amount - a.amount
        if (sortBy === 'edge') return (b.myFairProb - b.entryPrice) - (a.myFairProb - a.entryPrice)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [positions, filter, sortBy])

  const hasPnl = stats.totalPnl !== 0 || stats.closed > 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-mono font-bold text-text-primary tracking-wider">PORTFOLIO</h1>
          <p className="text-xs font-mono text-text-muted mt-0.5">
            {stats.total} POSITION{stats.total !== 1 ? 'S' : ''}{!synced ? ' · syncing...' : ''}
          </p>
        </div>
        <div className="relative group">
          <button
            onClick={() => atPositionLimit ? setShowPaywall(true) : setShowModal(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono font-bold rounded transition-colors ${
              atPositionLimit
                ? 'bg-bg-elevated border-bg-border text-text-muted cursor-not-allowed'
                : 'bg-accent/10 border-accent/30 text-accent hover:bg-accent/20'
            }`}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            ADD POSITION
          </button>
          {atPositionLimit && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-bg-surface border border-bg-border rounded-lg p-2.5 text-[10px] font-mono text-text-muted z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Pro plan includes unlimited positions
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className={`grid gap-3 mb-4 ${isAlpha && aiAccuracy ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <StatCard
          label="DEPLOYED"
          value={`$${stats.deployed.toFixed(0)}`}
          sub={`${stats.open} open`}
        />
        <StatCard
          label="WIN RATE"
          value={stats.winRate !== null ? `${stats.winRate.toFixed(0)}%` : '—'}
          sub={stats.closed > 0 ? `${stats.won}/${stats.closed} closed` : 'no closed bets'}
          highlight={stats.winRate !== null && stats.winRate >= 55}
        />
        <StatCard
          label="TOTAL P&L"
          value={hasPnl ? `${stats.totalPnl >= 0 ? '+' : ''}$${stats.totalPnl.toFixed(0)}` : '—'}
          sub={hasPnl ? 'realized' : 'pending'}
          positive={stats.totalPnl > 0}
          negative={stats.totalPnl < 0}
        />
        <StatCard
          label="ROI"
          value={hasPnl ? `${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%` : '—'}
          sub="on closed"
          positive={stats.roi > 0}
          negative={stats.roi < 0}
        />
        {isAlpha && aiAccuracy && (
          <StatCard
            label="AI ACCURACY"
            value={`${aiAccuracy.accuracy.toFixed(0)}%`}
            sub={`${aiAccuracy.total} resolved`}
            highlight={aiAccuracy.accuracy >= 60}
          />
        )}
      </div>

      {/* Charts */}
      {positions.length > 0 && (
        <>
          <PnlChart positions={positions} />
          <AllocationDonut positions={positions} />
          <ResolutionReminders positions={positions} />
        </>
      )}

      {/* Filters + sort */}
      {positions.length > 0 && (
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-1 bg-bg-surface border border-bg-border rounded p-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded transition-colors ${
                  filter === f.value
                    ? 'bg-accent/10 text-accent'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {f.label}
                {f.value !== 'all' && (
                  <span className="ml-1 opacity-60">
                    {positions.filter((p) => p.status === f.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-[10px] font-mono text-text-muted">SORT:</span>
            {(['date', 'amount', 'edge'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-2 py-1 text-[10px] font-mono rounded transition-colors uppercase ${
                  sortBy === s
                    ? 'text-accent border border-accent/30 bg-accent/5'
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {positions.length === 0 && (
        <div className="bg-bg-surface border border-bg-border rounded-lg p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center mx-auto mb-4">
            <svg className="w-5 h-5 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <p className="text-sm font-mono text-text-muted mb-2">NO POSITIONS YET</p>
          <p className="text-xs font-mono text-text-muted mb-5">
            Add your first position to start tracking edge and P&amp;L
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-accent/10 border border-accent/30 text-accent
              text-xs font-mono font-bold rounded hover:bg-accent/20 transition-colors"
          >
            ADD FIRST POSITION
          </button>
        </div>
      )}

      {/* Position list */}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((pos) => (
            <PositionCard
              key={pos.id}
              position={pos}
              onUpdateStatus={updateStatus}
              onDelete={deletePosition}
            />
          ))}
        </div>
      )}

      {positions.length > 0 && filtered.length === 0 && (
        <div className="text-center py-10">
          <p className="text-sm font-mono text-text-muted">
            NO {filter.toUpperCase()} POSITIONS
          </p>
        </div>
      )}

      {showModal && (
        <AddPositionModal
          onAdd={addPosition}
          onClose={() => setShowModal(false)}
        />
      )}

      {showPaywall && (
        <PaywallModal
          variant={paywallVariant}
          onClose={() => setShowPaywall(false)}
        />
      )}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  sub: string
  highlight?: boolean
  positive?: boolean
  negative?: boolean
}

function StatCard({ label, value, sub, highlight, positive, negative }: StatCardProps) {
  return (
    <div className={`bg-bg-surface border rounded-lg p-4 ${
      highlight ? 'border-accent/20' :
      positive ? 'border-accent/15' :
      negative ? 'border-danger/15' :
      'border-bg-border'
    }`}>
      <p className="text-[9px] font-mono text-text-muted tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-mono font-bold leading-none ${
        positive ? 'text-accent' :
        negative ? 'text-danger' :
        highlight ? 'text-accent' :
        'text-text-primary'
      }`}>
        {value}
      </p>
      <p className="text-[9px] font-mono text-text-muted mt-1.5">{sub}</p>
    </div>
  )
}
