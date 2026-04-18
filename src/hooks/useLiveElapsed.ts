'use client'
import { useEffect, useState } from 'react'

const PAUSED_STATUSES = new Set(['HT', 'BT', 'P', 'INT', 'SUSP'])

export function useLiveElapsed(
  anchor: number | null | undefined,
  status: 'scheduled' | 'live' | 'finished' | 'canceled' | undefined,
  statusShort: string | null | undefined,
): number | null {
  const [value, setValue] = useState<number | null>(anchor ?? null)
  const [anchoredAt, setAnchoredAt] = useState<number>(Date.now())

  useEffect(() => {
    setValue(anchor ?? null)
    setAnchoredAt(Date.now())
  }, [anchor])

  useEffect(() => {
    if (status !== 'live' || anchor == null) return
    if (statusShort && PAUSED_STATUSES.has(statusShort)) return
    const id = setInterval(() => {
      setValue(anchor + Math.floor((Date.now() - anchoredAt) / 60000))
    }, 1000)
    return () => clearInterval(id)
  }, [anchor, anchoredAt, status, statusShort])

  return value
}
