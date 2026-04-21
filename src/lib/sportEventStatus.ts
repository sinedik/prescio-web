import type { SportEvent } from '../types/index'
import type { MarketStatus } from './marketStatus'

/**
 * Maps SportEvent status to the canonical MarketStatus enum so that
 * SportMatchCard and related UI can reuse MarketStatusBadge and shared logic.
 */
export function mapSportStatus(status: SportEvent['status']): MarketStatus {
  switch (status) {
    case 'scheduled': return 'upcoming'
    case 'live':      return 'live'
    case 'finished':  return 'resolved'
    case 'canceled':  return 'cancelled'
  }
}
