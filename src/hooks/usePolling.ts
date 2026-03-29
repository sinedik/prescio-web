import { useState, useEffect, useRef } from 'react'

export function usePolling<T>(
  fetcher: () => Promise<T>,
  interval = 5 * 60 * 1000,
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<unknown>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        const result = await fetcher()
        if (mounted) {
          setData(result)
          setLastUpdated(new Date())
          setError(null)
        }
      } catch (e) {
        if (mounted) setError(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()
    timerRef.current = setInterval(run, interval)

    function handleVisibility() {
      if (document.hidden) {
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
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
  }, [])

  return { data, loading, error, lastUpdated }
}
