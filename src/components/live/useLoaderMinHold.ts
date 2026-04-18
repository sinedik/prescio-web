import { useEffect, useRef, useState } from 'react'

// Once the loader shows, hold it for a full animation cycle (default 1.3s) so a
// fast fetch doesn't flash the rhombus on screen. The cycle ends back at the
// rest pose, so the transition to idle is seamless.
export function useLoaderMinHold(rawLoading: boolean, holdMs = 1300): boolean {
  const [hold, setHold] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!rawLoading) return
    setHold(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setHold(false), holdMs)
  }, [rawLoading, holdMs])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return rawLoading || hold
}
