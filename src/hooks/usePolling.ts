import { useState, useEffect, useRef } from 'react'

// Module-level cache — survives component unmount/remount, cleared on full page reload
const cache = new Map<string, { data: unknown; ts: number }>()
const CACHE_TTL = 60_000 // 60 s — show cached data immediately, still refetch in background

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readCache<T>(key: string): T | null {
  const entry = cache.get(key)
  return entry && Date.now() - entry.ts < CACHE_TTL ? (entry.data as T) : null
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval = 5 * 60 * 1000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...deps: any[]
) {
  const cacheKey = deps.map(String).join(':')

  // Lazy initializer — only runs on mount, reads from cache
  const [data, setData] = useState<T | null>(() => readCache<T>(cacheKey))
  const [loading, setLoading] = useState(() => readCache<T>(cacheKey) === null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasDataRef = useRef(readCache<T>(cacheKey) !== null)

  useEffect(() => {
    let mounted = true
    if (!hasDataRef.current) {
      setLoading(true)
    } else {
      // Have cached data — background refresh
      setIsRefreshing(true)
    }

    async function run() {
      try {
        const result = await fetcher()
        if (mounted) {
          hasDataRef.current = true
          cache.set(cacheKey, { data: result, ts: Date.now() })
          setData(result)
          setLastUpdated(new Date())
          setError(null)
          setLoading(false)
          setIsRefreshing(false)
        }
      } catch (e) {
        if (mounted) {
          setError(e)
          setLoading(false)
          setIsRefreshing(false)
        }
      }
    }

    run()
    timerRef.current = setInterval(run, interval)

    function handleVisibility() {
      if (document.hidden) {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      } else {
        run()
        timerRef.current = setInterval(run, interval)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, isRefreshing, error, lastUpdated }
}
