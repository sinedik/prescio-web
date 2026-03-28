import type { FeedResponse, Market, MarketOpportunity, SortField } from './types'
import { supabase } from './lib/supabase'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

export async function getFeed(params?: {
  category?: string
  horizon?: string
  confidence?: 'high' | ''
  sort?: SortField
  search?: string
}): Promise<{ items: MarketOpportunity[]; scanning: boolean; cachedAt?: string }> {
  const search = new URLSearchParams()
  if (params?.category && params.category !== 'all') search.set('category', params.category)
  if (params?.horizon && params.horizon !== 'any') search.set('horizon', params.horizon)
  if (params?.confidence) search.set('confidence', params.confidence)
  if (params?.sort && params.sort !== 'edge') search.set('sort', params.sort)
  if (params?.search) search.set('search', params.search)

  const url = `${BASE}/feed${search.toString() ? '?' + search.toString() : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Feed error: ${res.status}`)
  const data: FeedResponse = await res.json()
  const items: MarketOpportunity[] = Array.isArray(data)
    ? data
    : (data.opportunities ?? data.markets ?? [])
  return { items, scanning: data.scanning ?? false, cachedAt: data.cachedAt }
}

export async function getMarkets(params?: {
  topic?: string
  minVolume?: number
  limit?: number
}): Promise<Market[]> {
  const search = new URLSearchParams()
  if (params?.topic) search.set('topic', params.topic)
  if (params?.minVolume) search.set('minVolume', String(params.minVolume))
  if (params?.limit) search.set('limit', String(params.limit))

  const url = `${BASE}/markets${search.toString() ? '?' + search.toString() : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Markets error: ${res.status}`)
  const data = await res.json()
  if (Array.isArray(data)) return data
  return data.markets ?? []
}

export async function analyzeMarket(query: string): Promise<MarketOpportunity> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE}/analyze?q=${encodeURIComponent(query)}`, { headers })

  if (res.status === 403) {
    const data = await res.json()
    if (data.error === 'limit_reached') {
      throw Object.assign(new Error('Daily limit reached'), { type: 'limit_reached', ...data })
    }
  }

  if (!res.ok) throw new Error(`Analyze error: ${res.status}`)
  return res.json()
}

export async function getMarketBySlug(slug: string): Promise<Market | null> {
  const res = await fetch(`${BASE}/market/${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Market fetch error: ${res.status}`)
  return res.json()
}

export async function getMarketHistory(
  slug: string,
  interval: '1w' | '1m' | '6m' | 'max' = 'max',
): Promise<{ t: number; p: number }[]> {
  const res = await fetch(
    `${BASE}/market/${encodeURIComponent(slug)}/history?fidelity=60&interval=${interval}`
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.history ?? []
}

export async function getHealth(): Promise<{ status: string; services?: Record<string, boolean>; lastScannedAt?: string; scanning?: boolean }> {
  const res = await fetch(`${BASE}/health`)
  if (!res.ok) throw new Error('Health check failed')
  return res.json()
}

export async function activatePro(transactionId: string): Promise<{ activated: boolean }> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE}/paddle/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ transactionId }),
  })
  if (!res.ok) throw new Error('Activation failed')
  return res.json()
}

export async function getPaddlePortal(): Promise<{ url: string }> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE}/paddle/portal`, { headers })
  if (!res.ok) throw new Error('Portal failed')
  return res.json()
}
