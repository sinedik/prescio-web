export interface ProbabilityOutcome {
  prob: number
}

export interface NormalizedOutcome<T> {
  outcome: T
  raw: number
  normalizedPct: number
}

function warnOnce(id: string) {
  if (process.env.NODE_ENV === 'production') return
  const store = (globalThis as unknown as { __probWarnSet?: Set<string> })
  if (!store.__probWarnSet) store.__probWarnSet = new Set()
  if (store.__probWarnSet.has(id)) return
  store.__probWarnSet.add(id)
  console.warn(id)
}

/**
 * Takes raw probabilities (any scale: 0-1, 0-100, decimal odds prices),
 * normalizes to fractions summing to 1.0, then rounds to integers summing
 * to exactly 100 via largest-remainder method.
 *
 * Returns outcomes in the original order, each annotated with its integer
 * percentage. If sum of raw inputs (when treated as 0-1 fractions) deviates
 * from 1.0 by more than 5%, emits a dev-only warning with the given id.
 */
export function normalizeOutcomeProbabilities<T>(
  outcomes: T[],
  getRaw: (o: T) => number | null | undefined,
  id?: string,
): NormalizedOutcome<T>[] {
  const raws = outcomes.map(o => {
    const v = getRaw(o)
    if (v == null || !Number.isFinite(v) || v < 0) return 0
    return v > 1 ? v / 100 : v
  })

  const sum = raws.reduce((a, b) => a + b, 0)

  if (id && Math.abs(sum - 1) > 0.05 && sum > 0) {
    warnOnce(`[probabilities] ${id} raw sum=${sum.toFixed(3)} deviates >5% from 1.0`)
  }

  if (sum <= 0) {
    return outcomes.map((outcome, i) => ({ outcome, raw: raws[i], normalizedPct: 0 }))
  }

  const exact = raws.map(r => (r / sum) * 100)
  const floors = exact.map(v => Math.floor(v))
  const remainders = exact.map((v, i) => ({ i, frac: v - floors[i] }))
  let remaining = 100 - floors.reduce((a, b) => a + b, 0)

  remainders.sort((a, b) => b.frac - a.frac)
  const pcts = floors.slice()
  for (let k = 0; k < remainders.length && remaining > 0; k++) {
    pcts[remainders[k].i] += 1
    remaining -= 1
  }

  return outcomes.map((outcome, i) => ({
    outcome,
    raw: raws[i],
    normalizedPct: pcts[i],
  }))
}

/**
 * Binary YES/NO helper: given yesPrice and optional noPrice (any scale),
 * returns integer percentages summing to 100.
 * If noPrice is null, derives it as 100 - yes.
 */
export function normalizeBinary(
  yesPrice: number | null | undefined,
  noPrice: number | null | undefined,
  id?: string,
): { yes: number; no: number } | null {
  if (yesPrice == null || !Number.isFinite(yesPrice)) return null
  const yes = yesPrice > 1 ? yesPrice / 100 : yesPrice
  if (noPrice == null || !Number.isFinite(noPrice)) {
    const pct = Math.max(0, Math.min(100, Math.round(yes * 100)))
    return { yes: pct, no: 100 - pct }
  }
  const [a, b] = normalizeOutcomeProbabilities(
    [{ p: yes }, { p: noPrice > 1 ? noPrice / 100 : noPrice }],
    o => o.p,
    id,
  )
  return { yes: a.normalizedPct, no: b.normalizedPct }
}
