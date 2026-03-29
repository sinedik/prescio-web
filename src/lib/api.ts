import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL ?? ''

async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> ?? {}),
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw { status: res.status, ...error }
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

export const api = {
  // Feed (Events)
  getFeed: (params?: Record<string, string>) =>
    apiFetch(`/api/feed${toSearch(params)}`),

  // Events
  getEvent: (id: string) =>
    apiFetch(`/api/events/${id}`),

  // Markets
  getMarkets: (params?: Record<string, string | number>) =>
    apiFetch(`/api/markets${toSearch(params)}`),
  getMarket: (id: string) =>
    apiFetch(`/api/markets/${id}`),
  analyzeMarket: (id: string) =>
    apiFetch(`/api/markets/${id}/analyze`, { method: 'POST' }),

  // Watchlist
  getWatchlist: () =>
    apiFetch('/api/watchlist'),
  addToWatchlist: (data: { type: 'event' | 'market'; id: string }) =>
    apiFetch('/api/watchlist', { method: 'POST', body: JSON.stringify(data) }),
  removeFromWatchlist: (id: string) =>
    apiFetch(`/api/watchlist/${id}`, { method: 'DELETE' }),

  // Portfolio
  getPortfolio: () =>
    apiFetch('/api/portfolio'),
  addPosition: (data: unknown) =>
    apiFetch('/api/portfolio', { method: 'POST', body: JSON.stringify(data) }),
  updatePosition: (id: string, data: unknown) =>
    apiFetch(`/api/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePosition: (id: string) =>
    apiFetch(`/api/portfolio/${id}`, { method: 'DELETE' }),

  // Alerts
  getAlerts: () =>
    apiFetch('/api/alerts'),

  // Accuracy
  getAccuracy: () =>
    apiFetch<{ accuracy: number; total: number; correct: number }>('/api/accuracy'),
}
