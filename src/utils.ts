export function formatProb(p: number): string {
  const pct = p > 1 ? p : p * 100
  return `${Math.round(pct)}%`
}

export function formatEdge(edge: number): string {
  const pp = Math.abs(Math.abs(edge) > 1 ? edge : edge * 100)
  const sign = edge >= 0 ? '+' : '-'
  return `${sign}${pp.toFixed(1)}pp`
}

export function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
  return `$${v}`
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null
  try {
    const now = Date.now()
    const target = new Date(dateStr).getTime()
    return Math.ceil((target - now) / 86_400_000)
  } catch {
    return null
  }
}

export function edgeColor(edge: number): string {
  const pp = Math.abs(Math.abs(edge) > 1 ? edge : edge * 100)
  if (pp >= 10) return 'text-accent-green'
  if (pp >= 5) return 'text-accent-yellow'
  return 'text-text-secondary'
}

export function platformColor(platform: string): string {
  const p = platform?.toLowerCase()
  if (p?.includes('poly')) return 'text-blue-400 bg-blue-400/10'
  if (p?.includes('meta')) return 'text-purple-400 bg-purple-400/10'
  if (p?.includes('kalshi')) return 'text-amber-400 bg-amber-400/10'
  return 'text-text-muted bg-bg-elevated'
}

export function actionColor(action: string): string {
  if (!action) return 'text-text-muted bg-bg-elevated'
  const a = action.toUpperCase()
  if (a === 'ENTER' || a.includes('BUY') || a.includes('LONG')) return 'text-accent-green bg-accent-green/10'
  if (a === 'WATCH' || a.includes('HOLD')) return 'text-accent-yellow bg-accent-yellow/10'
  if (a === 'SKIP' || a.includes('PASS') || a.includes('AVOID') || a === 'NO_ACTION') return 'text-text-muted bg-bg-elevated'
  if (a.includes('YES')) return 'text-accent-green bg-accent-green/10'
  if (a.includes('SELL') || a.includes('NO') || a.includes('SHORT')) return 'text-accent-red bg-accent-red/10'
  return 'text-accent-yellow bg-accent-yellow/10'
}

export function normalizeEdge(item: { analysis: { edge: number; marketProb: number; fairProb: number } }): number {
  const { edge, marketProb, fairProb } = item.analysis
  // edge might be decimal (0.12) or percentage (12)
  if (Math.abs(edge) <= 1 && Math.abs(edge) > 0) return edge * 100
  return edge
}
