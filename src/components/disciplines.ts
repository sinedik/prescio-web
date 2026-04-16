export type Discipline =
  | 'football' | 'basketball' | 'tennis' | 'mma'
  | 'cs2' | 'dota2' | 'valorant'

export const ACCENT: Record<Discipline, string> = {
  football:   '#e8c032',
  basketball: '#e66414',
  tennis:     '#C8E63C',
  mma:        '#e02020',
  cs2:        '#e66414',
  dota2:      '#c0392b',
  valorant:   '#ff4655',
}
