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

// rgb(var()) variants — usable with color-mix and opacity modifiers.
export const ACCENT_RGB: Record<Discipline, string> = {
  football:   'rgb(var(--sport-football-rgb))',
  basketball: 'rgb(var(--sport-basketball-rgb))',
  tennis:     'rgb(var(--sport-tennis-rgb))',
  mma:        'rgb(var(--sport-mma-rgb))',
  cs2:        'rgb(var(--sport-cs2-rgb))',
  dota2:      'rgb(var(--sport-dota2-rgb))',
  valorant:   'rgb(var(--sport-valorant-rgb))',
}

// Infer discipline from the current URL. Used in route-level `loading.tsx`
// (Next.js Suspense fallbacks don't receive route params, so we read the
// pathname directly). Returns null if no discipline segment is present —
// callers can fall back to a neutral accent.
const DISCIPLINES: Discipline[] = [
  'football', 'basketball', 'tennis', 'mma', 'cs2', 'dota2', 'valorant',
]
export function disciplineFromPath(pathname: string): Discipline | null {
  const segments = pathname.split('/').filter(Boolean)
  for (const seg of segments) {
    if ((DISCIPLINES as string[]).includes(seg)) return seg as Discipline
  }
  return null
}
