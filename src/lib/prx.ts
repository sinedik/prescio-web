export const PRX_THRESHOLD = 2

/**
 * Returns PRX edge if detected above threshold, otherwise null.
 * Currently PRX is only active for prediction markets (Market.ai.edge).
 * Sport/Esports PRX support is scaffolded but awaiting AI signal integration
 * (see TODO.md).
 */
export function getPrxEdge(source: unknown): number | null {
  if (!source || typeof source !== 'object') return null
  const ai = (source as { ai?: { edge?: number | null } | null }).ai
  const edge = ai?.edge
  if (edge == null || Math.abs(edge) < PRX_THRESHOLD) return null
  return edge
}

export function hasPrx(edge: number | null | undefined): boolean {
  return edge != null && Math.abs(edge) >= PRX_THRESHOLD
}

export function formatPrx(edge: number): string {
  const rounded = Math.round(edge)
  return `${rounded > 0 ? '+' : ''}${rounded}`
}
