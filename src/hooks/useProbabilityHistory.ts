import { useMemo } from 'react'

export interface ProbabilityPoint {
  t: string            // ISO timestamp
  home: number         // 0..1
  draw?: number | null // 0..1 (optional, 1X2 only)
  away: number         // 0..1
}

// Scaffolded: returns empty until backend ships win-probability time-series
// per event (see TODO.md "Live win-probability time-series для sparkline").
// Keeping API-shape so consumers can integrate real data without refactor.
export function useProbabilityHistory(_eventId: string) {
  const data = useMemo<ProbabilityPoint[]>(() => [], [])
  return {
    data,
    isLoading: false,
    error: null as unknown,
  }
}
