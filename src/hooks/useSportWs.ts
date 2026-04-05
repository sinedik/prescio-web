'use client'
import { useEffect, useRef, useCallback } from 'react'

type WsMessage =
  | { type: 'event_update'; data: Record<string, unknown> }
  | { type: 'odds_update'; eventId: string; data: Record<string, unknown> }
  | { type: 'list_update'; data: { id: string; status: string; home_score: number | null; away_score: number | null } }

interface UseSportWsOptions {
  eventId?: string
  subscribeList?: boolean
  onEventUpdate?: (data: Record<string, unknown>) => void
  onOddsUpdate?: (eventId: string, data: Record<string, unknown>) => void
  onListUpdate?: (data: { id: string; status: string; home_score: number | null; away_score: number | null }) => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'
const WS_URL  = API_URL.replace(/^http/, 'ws') + '/ws'

export function useSportWs({ eventId, subscribeList, onEventUpdate, onOddsUpdate, onListUpdate }: UseSportWsOptions) {
  const wsRef      = useRef<WebSocket | null>(null)
  const reconnectT = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onEventUpdateRef = useRef(onEventUpdate)
  const onOddsUpdateRef  = useRef(onOddsUpdate)
  const onListUpdateRef  = useRef(onListUpdate)
  onEventUpdateRef.current = onEventUpdate
  onOddsUpdateRef.current  = onOddsUpdate
  onListUpdateRef.current  = onListUpdate

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      if (eventId) ws.send(JSON.stringify({ type: 'subscribe', eventId }))
      if (subscribeList) ws.send(JSON.stringify({ type: 'subscribe_list' }))
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WsMessage
        if (msg.type === 'event_update') onEventUpdateRef.current?.(msg.data)
        if (msg.type === 'odds_update')  onOddsUpdateRef.current?.(msg.eventId, msg.data)
        if (msg.type === 'list_update')  onListUpdateRef.current?.(msg.data)
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      reconnectT.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => ws.close()
  }, [eventId, subscribeList])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectT.current) clearTimeout(reconnectT.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect])
}
