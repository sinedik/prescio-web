import { supabase } from './supabase/client'
import type {
  UnifiedEvent, SportEvent, UserProfile,
  UserInterest, UserSearch,
  SportPrediction, SportStanding, SportInjury, SportTeam, PlayerProfile,
  SportLineup, SportFixtureStat, SportMatchEvent, SportTopScorer, SportSquadPlayer, TeamFixture,
  LeaguePageData,
} from '../types/index'
import type {
  DotaSeries, DotaLiveMatch, DotaProMatch,
  DotaMatchDetail, DotaHero, DotaItem,
} from '../types/dota'
import type { EsportsMatch, EsportsMatchDetail, EsportsTeamPageData } from '../types'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

function getLang(): string {
  try { return localStorage.getItem('prescio_lang') || 'en' } catch { return 'en' }
}

async function doFetch(path: string, options: RequestInit, authHeaders: Record<string, string>) {
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Lang': getLang(),
      ...authHeaders,
      ...(options.headers as Record<string, string> ?? {}),
    },
  })
}

let refreshPromise: Promise<string | null> | null = null

async function refreshSessionOnce(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const { data, error } = await supabase.auth.refreshSession()
        if (error || !data.session?.access_token) return null
        return data.session.access_token
      } finally {
        setTimeout(() => { refreshPromise = null }, 0)
      }
    })()
  }
  return refreshPromise
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  let authHeaders = await getAuthHeader()
  let res = await doFetch(path, options, authHeaders)

  if (res.status === 401 && authHeaders.Authorization) {
    const token = await refreshSessionOnce()
    if (token) {
      authHeaders = { Authorization: `Bearer ${token}` }
      res = await doFetch(path, options, authHeaders)
    }
    if (res.status === 401) {
      await supabase.auth.signOut()
      if (typeof window !== 'undefined') {
        const next = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.replace(`/auth?next=${next}&expired=1`)
      }
      throw Object.assign(new Error('Session expired'), { status: 401 })
    }
  }

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
}

export const sportApi = {
  getEvents: (params: { subcategory?: string; status?: string; limit?: number; offset?: number; starts_after?: string; starts_before?: string }) =>
    apiFetch<{ events: SportEvent[] }>(`/sport/events${toSearch(params)}`),
  getEvent:       (id: string) => apiFetch<SportEvent>(`/sport/events/${id}`),
  getEventFull:   (id: string) => apiFetch<{
    event: SportEvent
    form: { home_form: { result: 'W'|'D'|'L'; home: string; away: string; score: string; date: string }[] | null; away_form: { result: 'W'|'D'|'L'; home: string; away: string; score: string; date: string }[] | null }
    prediction: SportPrediction | null
  }>(`/sport/events/${id}/full`),
  getEventDetails: (id: string) => apiFetch<{
    standings: SportStanding[]
    topScorers: SportTopScorer[]
    homeInjuries: SportInjury[]
    awayInjuries: SportInjury[]
    lineups: SportLineup[]
    stats: SportFixtureStat[]
    matchEvents: SportMatchEvent[]
  }>(`/sport/events/${id}/details`),
  getOddsHistory: (id: string, limit?: number) =>
    apiFetch<{ bookmaker: string; market_type: string; outcomes: { name: string; price: number }[]; recorded_at: string }[]>(
      `/sport/events/${id}/odds-history${limit ? `?limit=${limit}` : ''}`
    ),
  getForm:        (id: string) => apiFetch<{
    home_form: { result: 'W'|'D'|'L'; home: string; away: string; score: string; date: string }[] | null
    away_form: { result: 'W'|'D'|'L'; home: string; away: string; score: string; date: string }[] | null
  }>(`/sport/events/${id}/form`),
  getPredictions: (id: string) => apiFetch<SportPrediction | null>(`/sport/events/${id}/predictions`),
  getStandings:   (leagueId: number) => apiFetch<SportStanding[]>(`/sport/standings/${leagueId}`),
  getInjuries:    (params: { leagueId?: number; teamId?: number }) =>
    apiFetch<SportInjury[]>(`/sport/injuries${toSearch(params)}`),
  getTeam:        (teamId: number) => apiFetch<{ team: SportTeam | null; standings: SportStanding[]; injuries: SportInjury[]; squad: SportSquadPlayer[] }>(`/sport/teams/${teamId}`),
  getPlayer:      (playerId: number) => apiFetch<PlayerProfile>(`/sport/players/${playerId}`),
  getTeamFixtures:(teamId: number, last = 10) => apiFetch<TeamFixture[]>(`/sport/teams/${teamId}/fixtures?last=${last}`),
  getLineups:     (id: string) => apiFetch<SportLineup[]>(`/sport/events/${id}/lineups`),
  getMatchStats:  (id: string) => apiFetch<SportFixtureStat[]>(`/sport/events/${id}/stats`),
  getMatchEvents: (id: string) => apiFetch<SportMatchEvent[]>(`/sport/events/${id}/match-events`),
  getSquad:       (teamExternalId: number) => apiFetch<SportSquadPlayer[]>(`/sport/teams/${teamExternalId}/squad`),
  getTopScorers:  (leagueId: number, season?: number) => apiFetch<SportTopScorer[]>(`/sport/topscorers/${leagueId}${season ? `?season=${season}` : ''}`),
  getLeague:      (leagueId: number, subcategory?: string) => apiFetch<LeaguePageData>(`/sport/leagues/${leagueId}${subcategory ? `?subcategory=${subcategory}` : ''}`),
}

export const searchApi = {
  getHistory: (limit = 20, offset = 0) =>
    apiFetch<{ searches: UserSearch[] }>(`/search/history${toSearch({ limit, offset })}`),
}

export const authApi = {
  getMe: () => apiFetch<UserProfile>('/user/me'),
  getInterests: () => apiFetch<{ interests: UserInterest[] }>('/user/interests'),
  exportData: () => apiFetch<Record<string, unknown>>('/user/export'),
  deleteAccount: () => apiFetch<{ deleted: boolean; grace_days: number }>('/user/me', { method: 'DELETE' }),
  restoreAccount: () => apiFetch<{ restored: boolean }>('/user/me/restore', { method: 'POST' }),
  markHasPassword: () => apiFetch<{ ok: true }>('/user/mark-has-password', { method: 'POST' }),
}

export const mfaApi = {
  generateRecoveryCodes: () => apiFetch<{ codes: string[] }>('/mfa/recovery-codes', { method: 'POST' }),
  recoveryCodesStatus: () => apiFetch<{ remaining: number }>('/mfa/recovery-codes/status'),
  consumeRecoveryCode: (code: string) =>
    apiFetch<{ ok: true }>('/mfa/recovery-codes/consume', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),
}

// ─── Прочие эндпоинты (используются Layout и другими существующими экранами) ───

export const api = {
  // Events
  getEvent: (id: string) =>
    apiFetch(`/events/${id}`),

  // Markets
  getMarkets: (params?: Record<string, string | number>) =>
    apiFetch(`/markets${toSearch(params)}`),
  getMarket: (id: string) =>
    apiFetch(`/markets/${id}`),

  // Watchlist
  getWatchlist: () =>
    apiFetch('/watchlist'),


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
  getEsportsTeam: (teamId: string) =>
    apiFetch<EsportsTeamPageData>(`/esports/teams/${teamId}`),

}
