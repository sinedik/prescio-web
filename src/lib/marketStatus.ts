export type MarketStatus = 'upcoming' | 'live' | 'resolving' | 'resolved' | 'cancelled'

export interface MarketStatusInfo {
  status: MarketStatus
  daysUntil: number | null
}

/** Minimum shape required to derive status. */
export interface MarketStatusInput {
  yesPrice?: number | null
  resolutionDate?: string | null
}

const MS_DAY = 86_400_000
const RESOLVING_WINDOW_DAYS = 2

/**
 * Derives a single canonical status from market data.
 *
 * upcoming  — resolution is in the future
 * live      — resolves today
 * resolving — past resolution date, price not yet stuck at 0/1
 * resolved  — past resolution date, price at 0 or 1 (terminal)
 * cancelled — not currently exposed by the Market type; reserved for future use
 */
export function getMarketStatus(market: MarketStatusInput): MarketStatusInfo {
  const yesNormalized = market.yesPrice != null
    ? (market.yesPrice > 1 ? market.yesPrice / 100 : market.yesPrice)
    : null

  if (!market.resolutionDate) {
    const terminal = yesNormalized === 0 || yesNormalized === 1
    return { status: terminal ? 'resolved' : 'upcoming', daysUntil: null }
  }

  const resolveMs = new Date(market.resolutionDate).getTime()
  if (!Number.isFinite(resolveMs)) {
    return { status: 'upcoming', daysUntil: null }
  }

  const diffMs = resolveMs - Date.now()
  const daysUntil = Math.ceil(diffMs / MS_DAY)

  if (diffMs > MS_DAY) {
    return { status: 'upcoming', daysUntil }
  }

  if (diffMs > 0) {
    return { status: 'live', daysUntil }
  }

  const terminal = yesNormalized === 0 || yesNormalized === 1
  if (terminal) {
    return { status: 'resolved', daysUntil }
  }

  const daysSince = -diffMs / MS_DAY
  if (daysSince <= RESOLVING_WINDOW_DAYS) {
    return { status: 'resolving', daysUntil }
  }

  return { status: 'resolved', daysUntil }
}
