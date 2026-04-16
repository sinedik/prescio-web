// Unified client-side data cache.
// - SWR-style: read cached value instantly, refetch in background.
// - In-flight dedup: concurrent fetchOnce() calls for the same key share one promise.
// - TTL is per-read: the same key may be consumed with different freshness windows.

interface Entry<T> { data: T; ts: number }

const store   = new Map<string, Entry<unknown>>()
const pending = new Map<string, Promise<unknown>>()

const DEFAULT_TTL = 5 * 60 * 1000

export function get<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const e = store.get(key) as Entry<T> | undefined
  if (!e) return null
  return Date.now() - e.ts > ttl ? null : e.data
}

export function set<T>(key: string, data: T): void {
  store.set(key, { data, ts: Date.now() })
}

export function invalidate(keyOrPrefix: string): void {
  if (store.has(keyOrPrefix)) { store.delete(keyOrPrefix); return }
  for (const k of store.keys()) if (k.startsWith(keyOrPrefix)) store.delete(k)
}

export async function fetchOnce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const inflight = pending.get(key) as Promise<T> | undefined
  if (inflight) return inflight
  const p = fetcher()
    .then(data => { set(key, data); return data })
    .finally(() => { pending.delete(key) })
  pending.set(key, p)
  return p
}

// ── Legacy aliases (keep existing imports working) ──────────────────────────
export const getCached = get
export const setCached = set
