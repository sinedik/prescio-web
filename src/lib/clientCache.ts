// Module-level in-memory cache for client-side SWR pattern.
// Data persists for the lifetime of the browser tab session.

interface CacheEntry<T> {
  data: T
  ts: number
}

const store = new Map<string, CacheEntry<unknown>>()

const DEFAULT_TTL = 5 * 60 * 1000 // 5 min

export function getCached<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.ts > ttl) return null
  return entry.data
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() })
}

export function invalidate(key: string): void {
  store.delete(key)
}
