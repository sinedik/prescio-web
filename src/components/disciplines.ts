export type Discipline =
  | 'football' | 'basketball' | 'tennis' | 'mma'
  | 'cs2' | 'dota2' | 'valorant'

// Theme-aware sport accents resolved via CSS vars (defined for both themes in globals.css).
// Callers using `${ACCENT[sport]}` get a `var(...)` string — drop into style.color/background directly.
// For alpha overlays use `mix(accent, pct)` below — hex-suffix concatenation breaks with var().
export function mix(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}

export const ACCENT: Record<Discipline, string> = {
  football:   'var(--sport-football)',
  basketball: 'var(--sport-basketball)',
  tennis:     'var(--sport-tennis)',
  mma:        'var(--sport-mma)',
  cs2:        'var(--sport-cs2)',
  dota2:      'var(--sport-dota2)',
  valorant:   'var(--sport-valorant)',
}
