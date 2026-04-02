import { supabase } from './supabase'
import type {
  UnifiedEvent, SportEvent, UserProfile,
  UserInterest, UserSearch, FeedFilters,
} from '../types/index'
import type {
  DotaSeries, DotaLiveMatch, DotaProMatch,
  DotaMatchDetail, DotaHero, DotaItem,
} from '../types/dota'
import type { EsportsMatch, EsportsMatchDetail } from '../types'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const authHeaders = await getAuthHeader()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw Object.assign(new Error(err.error || 'API error'), { status: res.status })
  }
  return res.json()
}

function toSearch(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return ''
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? '?' + s : ''
}

export const feedApi = {
  getEvents: (filters: FeedFilters, limit = 20, offset = 0) =>
    apiFetch<{ events: UnifiedEvent[]; total: number }>(
      `/feed${toSearch({
        ...(filters.category && { category: filters.category }),
        ...(filters.subcategory && { subcategory: filters.subcategory }),
        ...(filters.source_name && { source_name: filters.source_name }),
        sort: filters.sort,
        limit,
        offset,
      })}`
    ),
}

export interface CoinPrice {
  usd: number
  usd_24h_change: number
  usd_market_cap: number
  usd_24h_vol: number
}

export interface CoinMeta { id: string; symbol: string; name: string }

export const cryptoApi = {
  getPrices: (ids?: string) =>
    apiFetch<Record<string, CoinPrice>>(`/crypto/prices${ids ? `?ids=${ids}` : ''}`),
  getList: () =>
    apiFetch<CoinMeta[]>('/crypto/list'),
}

export const eventsApi = {
  getEvent: (id: string) => apiFetch<UnifiedEvent>(`/events/${id}`),
  analyzeMarket: (marketId: string) =>
    apiFetch<{ queued: boolean }>(`/markets/${marketId}/analyze`, { method: 'POST' }),
  analyzeEvent: (id: string) =>
    apiFetch<{ queued: boolean }>(`/events/${id}/analyze`, { method: 'POST' }),
}

export const sportApi = {
  getEvents: (params: { subcategory?: string; status?: string; limit?: number; offset?: number }) =>
    apiFetch<{ events: SportEvent[] }>(`/sport/events${toSearch(params)}`),
  getEvent: (id: string) => apiFetch<SportEvent>(`/sport/events/${id}`),
}

export const searchApi = {
  search: (query: string) =>
    apiFetch<{ searchId: string; query: string; summary: string; webResults: unknown[]; category?: string }>(
      '/search', { method: 'POST', body: JSON.stringify({ query }) }
    ),
  triggerAnalysis: (searchId: string) =>
    apiFetch<{ queued: boolean; searchId: string }>(`/search/${searchId}/analyze`, { method: 'POST' }),
  getHistory: (limit = 20, offset = 0) =>
    apiFetch<{ searches: UserSearch[] }>(`/search/history${toSearch({ limit, offset })}`),
}

export const authApi = {
  getMe: () => apiFetch<UserProfile>('/user/me'),
  getInterests: () => apiFetch<{ interests: UserInterest[] }>('/user/interests'),
  updateInterests: (interests: { category: string; subcategory?: string }[]) =>
    apiFetch<{ ok: boolean }>('/user/interests', {
      method: 'PUT',
      body: JSON.stringify({ interests }),
    }),
}

// ─── Прочие эндпоинты (используются Layout и другими существующими экранами) ───

export const api = {
  // Feed (legacy)
  getFeed: (params?: Record<string, string>) =>
    apiFetch(`/feed${toSearch(params)}`),

  // Events
  getEvent: (id: string) =>
    apiFetch(`/events/${id}`),

  // Markets
  getMarkets: (params?: Record<string, string | number>) =>
    apiFetch(`/markets${toSearch(params)}`),
  getMarket: (id: string) =>
    apiFetch(`/markets/${id}`),
  analyzeMarket: (id: string) =>
    apiFetch(`/markets/${id}/analyze`, { method: 'POST' }),
  analyzeEvent: (id: string) =>
    apiFetch(`/events/${id}/analyze`, { method: 'POST' }),

  // Watchlist
  getWatchlist: () =>
    apiFetch('/watchlist'),
  addToWatchlist: (data: { type: 'event' | 'market'; id: string }) =>
    apiFetch('/watchlist', { method: 'POST', body: JSON.stringify(data) }),
  removeFromWatchlist: (id: string) =>
    apiFetch(`/watchlist/${id}`, { method: 'DELETE' }),

  // Portfolio
  getPortfolio: () =>
    apiFetch('/portfolio'),
  addPosition: (data: unknown) =>
    apiFetch('/portfolio', { method: 'POST', body: JSON.stringify(data) }),
  updatePosition: (id: string, data: unknown) =>
    apiFetch(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePosition: (id: string) =>
    apiFetch(`/portfolio/${id}`, { method: 'DELETE' }),

  // Polymarket
  getPolymarketPortfolio: () =>
    apiFetch('/polymarket/portfolio'),
  getPolymarketActivity: (limit = 50) =>
    apiFetch(`/polymarket/activity?limit=${limit}`),

  // Alerts
  getAlerts: () =>
    apiFetch('/alerts'),

  // Accuracy
  getAccuracy: () =>
    apiFetch<{ accuracy: number; total: number; correct: number }>('/accuracy'),

  // User
  getUserMe: () =>
    apiFetch('/user/me'),
  getUserAnalyses: (params?: { status?: 'pending' | 'done' | 'failed'; limit?: number; offset?: number }) =>
    apiFetch(`/user/analyses${toSearch(params)}`),

  // Health
  getHealth: () =>
    apiFetch<{ status: string; services?: Record<string, boolean>; lastScannedAt?: string; scanning?: boolean }>('/health'),

  // Dota 2
  getDotaLive: () =>
    apiFetch<{ series: DotaSeries[]; total: number }>('/dota/live'),
  getDotaLiveMatch: (matchId: string | number, serverSteamId?: string, skip?: number) =>
    apiFetch<DotaLiveMatch>(`/dota/live/${matchId}${toSearch({ ...(serverSteamId ? { server_steam_id: serverSteamId } : {}), ...(skip != null ? { skip } : {}) })}`),
  getDotaMatches: (limit = 20, lessThan?: number) =>
    apiFetch<{ matches: DotaProMatch[]; total: number }>(`/dota/matches${toSearch({ limit, ...(lessThan ? { less_than: lessThan } : {}) })}`),
  getDotaMatch: (matchId: string | number) =>
    apiFetch<DotaMatchDetail>(`/dota/matches/${matchId}`),
  getDotaHeroes: () =>
    apiFetch<{ heroes: DotaHero[] }>('/dota/heroes'),
  getDotaItems: () =>
    apiFetch<{ items: DotaItem[] }>('/dota/items'),

  // Esports (GRID)
  getEsportsMatches: (game: string, window: string) =>
    apiFetch<{ matches: EsportsMatch[]; total: number }>(`/esports/matches${toSearch({ game, window })}`),
  getEsportsMatch: (seriesId: string) =>
    apiFetch<EsportsMatchDetail>(`/esports/matches/${seriesId}`),

  // Paddle
  activatePro: (transactionId: string) =>
    apiFetch<{ activated: boolean }>('/paddle/activate', {
      method: 'POST',
      body: JSON.stringify({ transactionId }),
    }),
  getPaddlePortal: () =>
    apiFetch<{ url: string }>('/paddle/portal'),
}
