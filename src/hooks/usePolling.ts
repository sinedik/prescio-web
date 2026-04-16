import { useState, useEffect, useRef } from 'react'
import { get as cacheGet, set as cacheSet, fetchOnce } from '../lib/dataCache'

// Polling hook with adaptive interval + shared dataCache.
// - `interval` as number: fixed refresh in ms.
// - `interval` as function (data) => number | null: recompute on each tick.
//   Return null to stop polling (e.g. for finished matches).
// - `initialData`: seed value (e.g. from SSR) — skip loading state on mount.
// - Pauses while tab is hidden, resumes + refreshes on visibility restore.
// - Concurrent mounts with the same deps share one in-flight request via fetchOnce.

type IntervalFn<T> = (data: T | null) => number | null

interface Options<T> {
  initialData?: T
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval: number | IntervalFn<T> = 5 * 60 * 1000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...rest: any[]
) {
  // Detect trailing options object: { initialData? }
  const maybeOpts = rest.length > 0 && rest[rest.length - 1] && typeof rest[rest.length - 1] === 'object' && !Array.isArray(rest[rest.length - 1]) && 'initialData' in rest[rest.length - 1]
    ? (rest.pop() as Options<T>)
    : undefined
  const deps = rest
  const cacheKey = 'poll:' + deps.map(String).join(':')
  const CACHE_TTL = 60_000

  // Seed cache from SSR initialData if present and cache empty.
  if (maybeOpts?.initialData !== undefined && cacheGet<T>(cacheKey, CACHE_TTL) === null) {
    cacheSet(cacheKey, maybeOpts.initialData)
  }

  const seed = cacheGet<T>(cacheKey, CACHE_TTL)
  const [data, setData] = useState<T | null>(seed)
  const [loading, setLoading] = useState(seed === null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef   = useRef<T | null>(seed)
  const hasData   = useRef(dataRef.current !== null)

  useEffect(() => {
    let mounted = true

    const clearTimer = () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }

    const scheduleNext = () => {
      const ms = typeof interval === 'function' ? interval(dataRef.current) : interval
      if (ms === null || ms === undefined) return
      timerRef.current = setTimeout(run, ms)
    }

    async function run() {
      if (!mounted) return
      if (hasData.current) setIsRefreshing(true)
      try {
        const result = await fetchOnce(cacheKey, fetcher)
        if (!mounted) return
        dataRef.current = result
        hasData.current = true
        setData(result)
        setLastUpdated(new Date())
        setError(null)
      } catch (e) {
        if (mounted) setError(e)
      } finally {
        if (mounted) {
          setLoading(false)
          setIsRefreshing(false)
          scheduleNext()
        }
      }
    }

    if (!hasData.current) setLoading(true)
    run()

    function handleVisibility() {
      if (document.hidden) {
        clearTimer()
      } else {
        clearTimer()
        run()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      clearTimer()
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, isRefreshing, error, lastUpdated }
}
