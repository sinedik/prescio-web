import { useCallback } from 'react'
import { usePolling } from './usePolling'
import { sportApi } from '../lib/api'

export interface OddsHistoryPoint {
  bookmaker: string
  market_type: string
  outcomes: { name: string; price: number }[]
  recorded_at: string
}

// Real data: wraps sportApi.getOddsHistory with polling (5 min refresh).
// Returns {} while upcoming/live; backend may return [] for events without recorded lines.
export function useOddsHistory(eventId: string, limit = 50) {
  const fetcher = useCallback(
    () => sportApi.getOddsHistory(eventId, limit),
    [eventId, limit],
  )
  const { data, loading, error, lastUpdated } = usePolling(fetcher, 5 * 60 * 1000, eventId, limit)
  return {
    data: (data as OddsHistoryPoint[] | null) ?? [],
    isLoading: loading,
    error,
    lastUpdated,
  }
}
