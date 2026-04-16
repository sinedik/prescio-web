'use server'
import { callApi } from './_internal'

export async function analyzeMarketAction(marketId: string) {
  return callApi<{ queued: boolean }>(`/markets/${marketId}/analyze`, { method: 'POST' })
}

export async function analyzeEventAction(eventId: string) {
  return callApi<{ queued: boolean }>(`/events/${eventId}/analyze`, { method: 'POST' })
}
