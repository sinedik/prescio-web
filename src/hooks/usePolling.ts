import { useState, useEffect, useRef } from 'react'
import { get as cacheGet, set as cacheSet } from '../lib/dataCache'

// Polling hook with adaptive interval + shared dataCache.
// - `interval` as number: fixed refresh in ms.
// - `interval` as function (data) => number | null: recompute on each tick.
//   Return null to stop polling (e.g. for finished matches).
// - Pauses while tab is hidden, resumes + refreshes on visibility restore.

type IntervalFn<T> = (data: T | null) => number | null

export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval: number | IntervalFn<T> = 5 * 60 * 1000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...deps: any[]
) {
  const cacheKey = 'poll:' + deps.map(String).join(':')
  const CACHE_TTL = 60_000

  const [data, setData] = useState<T | null>(() => cacheGet<T>(cacheKey, CACHE_TTL))
  const [loading, setLoading] = useState(() => cacheGet<T>(cacheKey, CACHE_TTL) === null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef   = useRef<T | null>(cacheGet<T>(cacheKey, CACHE_TTL))
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
        const result = await fetcher()
        if (!mounted) return
        dataRef.current = result
        hasData.current = true
        cacheSet(cacheKey, result)
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
