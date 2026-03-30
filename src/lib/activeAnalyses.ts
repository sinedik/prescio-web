const ACTIVE_KEY   = 'prescio_active_analyses'
const DONE_KEY     = 'prescio_done_analyses'
const MAX_AGE_MS   = 15 * 60 * 1000  // 15 min TTL for in-progress
const DONE_AGE_MS  = 7 * 24 * 60 * 60 * 1000 // 7 day TTL for completed

interface Entries { markets: Record<string, number>; events: Record<string, number> }

function readKey(key: string, maxAge: number): Entries {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? '{}') as Partial<Entries>
    const now = Date.now()
    const markets: Record<string, number> = {}
    for (const [id, ts] of Object.entries(raw.markets ?? {})) {
      if (now - ts < maxAge) markets[id] = ts
    }
    const events: Record<string, number> = {}
    for (const [id, ts] of Object.entries(raw.events ?? {})) {
      if (now - ts < maxAge) events[id] = ts
    }
    return { markets, events }
  } catch {
    return { markets: {}, events: {} }
  }
}

function writeKey(key: string, data: Entries) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ─── In-progress ──────────────────────────────────────────────────────────────

export function markAnalyzing(type: 'market' | 'event', id: string) {
  const data = readKey(ACTIVE_KEY, MAX_AGE_MS)
  if (type === 'market') data.markets[id] = Date.now()
  else data.events[id] = Date.now()
  writeKey(ACTIVE_KEY, data)
}

export function clearAnalyzing(type: 'market' | 'event', id: string) {
  const data = readKey(ACTIVE_KEY, MAX_AGE_MS)
  if (type === 'market') delete data.markets[id]
  else delete data.events[id]
  writeKey(ACTIVE_KEY, data)
}

export function isAnalyzing(type: 'market' | 'event', id: string): boolean {
  const data = readKey(ACTIVE_KEY, MAX_AGE_MS)
  return !!(type === 'market' ? data.markets[id] : data.events[id])
}

export function getAnalyzingIds(type: 'market' | 'event'): Set<string> {
  const data = readKey(ACTIVE_KEY, MAX_AGE_MS)
  return new Set(Object.keys(type === 'market' ? data.markets : data.events))
}

// ─── Completed ────────────────────────────────────────────────────────────────

export function markAnalyzed(type: 'market' | 'event', id: string) {
  const data = readKey(DONE_KEY, DONE_AGE_MS)
  if (type === 'market') data.markets[id] = Date.now()
  else data.events[id] = Date.now()
  writeKey(DONE_KEY, data)
}

export function getAnalyzedIds(type: 'market' | 'event'): Set<string> {
  const data = readKey(DONE_KEY, DONE_AGE_MS)
  return new Set(Object.keys(type === 'market' ? data.markets : data.events))
}
