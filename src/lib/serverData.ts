// Server-only data fetchers for SSR (Server Components).
// Provide lightweight first-paint data; client polling hydrates the full payload.
// Do not import from client components.

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { getSupabaseServerClient } from './supabase/server'
import type { EsportsMatch, EsportsTeamPageData, Market } from '../types'
import type { SportEvent, SportTeam, SportStanding, SportInjury, SportSquadPlayer, PlayerProfile, LeaguePageData } from '../types/index'

const GAME_SUBCATEGORIES: Record<string, string[]> = {
  cs2:   ['cs2', 'csgo'],
  dota2: ['dota2', 'dota'],
}

interface EsportsMatchRow {
  id: string
  yes_price: number
  no_price: number
  esports_matches: {
    external_id: string
    tournament_name: string | null
    format: string | null
    starts_at: string
    team_a_id: number | null
    team_a_name: string | null
    team_b_id: number | null
    team_b_name: string | null
  }
}

async function fetchEsportsListImpl(game: string, window: string): Promise<EsportsMatch[]> {
  const subcats = GAME_SUBCATEGORIES[game]
  if (!subcats) return []

  const now = Date.now()
  const from = new Date(now - 6 * 3600_000).toISOString()
  const horizon = window === 'live' ? 0 : window === '1h' ? 1 : window === '3h' ? 3 : window === '12h' ? 12 : 48
  const to   = new Date(now + horizon * 3600_000).toISOString()

  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from('esports_markets')
    .select(`
      id, yes_price, no_price,
      esports_matches!inner(external_id, tournament_name, format, starts_at, team_a_id, team_a_name, team_b_id, team_b_name, source, subcategory)
    `)
    .eq('market_type', 'MATCH_WINNER')
    .eq('esports_matches.source', 'grid')
    .in('esports_matches.subcategory', subcats)
    .gte('esports_matches.starts_at', from)
    .lte('esports_matches.starts_at', to)
    .limit(60)

  if (error) throw error

  const rows = (data ?? []) as unknown as EsportsMatchRow[]
  return rows
    .filter(r => !/GRID-TEST/i.test(r.esports_matches?.tournament_name ?? ''))
    .map(r => {
      const m = r.esports_matches
      return {
        id: m.external_id,
        marketId: r.id,
        teamA: { id: m.team_a_id != null ? String(m.team_a_id) : undefined, name: m.team_a_name ?? '', score: null, logoUrl: null, colorPrimary: null, colorSecondary: null },
        teamB: { id: m.team_b_id != null ? String(m.team_b_id) : undefined, name: m.team_b_name ?? '', score: null, logoUrl: null, colorPrimary: null, colorSecondary: null },
        tournament: m.tournament_name ?? 'Other',
        format: m.format ?? '',
        startsAt: m.starts_at,
        yesPrice: r.yes_price,
        noPrice: r.no_price,
        status: 'upcoming' as const,
        games: [],
        steamData: null,
      }
    })
}

// Bucket cached per (game, window) — revalidated every 30s + on `esports-list` tag.
// Errors are NOT cached (try/catch wraps the cache call).
export const fetchEsportsListSSR = cache(async (game: string, window: string): Promise<EsportsMatch[]> => {
  try {
    return await unstable_cache(
      () => fetchEsportsListImpl(game, window),
      ['esports-list', game, window],
      { revalidate: 30, tags: ['esports-list', `esports-list:${game}`] },
    )()
  } catch {
    return []
  }
})

interface SportEventRow {
  id: string
  source: string | null
  category: string | null
  subcategory: string | null
  league: string | null
  home_team: string
  away_team: string
  starts_at: string
  status: string
  home_score: number | null
  away_score: number | null
  raw_data: Record<string, unknown> | null
  sport_odds: { bookmaker: string; market_type: string; outcomes: unknown }[] | null
}

async function fetchSportEventsImpl(subcategory: string): Promise<SportEvent[]> {
  const from = new Date(); from.setHours(0, 0, 0, 0)
  const to   = new Date(from); to.setDate(to.getDate() + 30); to.setHours(23, 59, 59, 999)

  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from('sport_events')
    .select('id,source,category,subcategory,league,home_team,away_team,starts_at,status,home_score,away_score,raw_data,sport_odds(bookmaker,market_type,outcomes)')
    .eq('subcategory', subcategory)
    .gte('starts_at', from.toISOString())
    .lte('starts_at', to.toISOString())
    .order('starts_at', { ascending: true })
    .limit(100)

  if (error) throw error

  const rows = (data ?? []) as unknown as SportEventRow[]
  return rows.map(e => ({
    id: e.id,
    source: e.source ?? '',
    category: e.category ?? '',
    subcategory: e.subcategory ?? '',
    league: e.league ?? '',
    home_team: e.home_team,
    away_team: e.away_team,
    starts_at: e.starts_at,
    status: e.status as SportEvent['status'],
    home_score: e.home_score ?? undefined,
    away_score: e.away_score ?? undefined,
    raw_data: e.raw_data ?? null,
    sport_odds: (e.sport_odds ?? []).map(o => ({
      bookmaker: o.bookmaker,
      market_type: o.market_type,
      outcomes: o.outcomes as { name: string; price: number }[],
    })),
  })) as SportEvent[]
}

// Bucket cached per subcategory — 60s TTL + revalidate via `sport-events` tag on sync jobs.
// Errors are NOT cached (try/catch wraps the cache call).
export const fetchSportEventsSSR = cache(async (subcategory: string): Promise<SportEvent[]> => {
  try {
    return await unstable_cache(
      () => fetchSportEventsImpl(subcategory),
      ['sport-events', subcategory],
      { revalidate: 60, tags: ['sport-events', `sport-events:${subcategory}`] },
    )()
  } catch {
    return []
  }
})

// ─── Server-side fetchers via the backend API (for match/event detail) ────────
// Hitting backend from Server Component adds one hop, but returns the fully
// enriched payload (live state, team meta). Client polling continues afterward.

const API_ORIGIN = process.env.API_PROXY_TARGET ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function serverFetch<T>(path: string, revalidate = 30): Promise<T | null> {
  try {
    const res = await fetch(`${API_ORIGIN}${path}`, { next: { revalidate } })
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

export const fetchEsportsMatchSSR = cache(async (seriesId: string) => {
  return serverFetch<unknown>(`/api/esports/matches/${seriesId}`, 15)
})

interface SportEventFull {
  event: SportEvent
  form: { home_form: unknown[] | null; away_form: unknown[] | null }
  prediction: unknown | null
}

export const fetchSportEventFullSSR = cache(async (id: string) => {
  return serverFetch<SportEventFull>(`/api/sport/events/${id}/full`, 30)
})

interface UnifiedEventRow {
  id: string
  title: string | null
  description: string | null
  category: string | null
  subcategory: string | null
  image_url: string | null
  enrichment_status: string | null
  updated_at: string | null
}

async function fetchUnifiedEventImpl(id: string): Promise<UnifiedEventRow | null> {
  const supabase = await getSupabaseServerClient()
  const { data, error } = await supabase
    .from('unified_events')
    .select('id, title, description, category, subcategory, image_url, enrichment_status, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as UnifiedEventRow | null
}

export const fetchUnifiedEventSSR = cache(async (id: string): Promise<UnifiedEventRow | null> => {
  try {
    return await unstable_cache(
      () => fetchUnifiedEventImpl(id),
      ['unified-event', id],
      { revalidate: 120, tags: ['unified-event', `unified-event:${id}`] },
    )()
  } catch {
    return null
  }
})

export interface SportTeamSSR {
  team: SportTeam | null
  standings: SportStanding[]
  injuries: SportInjury[]
  squad: SportSquadPlayer[]
}
export const fetchSportTeamSSR = cache(async (teamId: number) => {
  return serverFetch<SportTeamSSR>(`/api/sport/teams/${teamId}`, 300)
})

export const fetchSportPlayerSSR = cache(async (playerId: number) => {
  return serverFetch<PlayerProfile>(`/api/sport/players/${playerId}`, 300)
})

export const fetchSportLeagueSSR = cache(async (leagueId: number, subcategory?: string) => {
  const qs = subcategory ? `?subcategory=${subcategory}` : ''
  return serverFetch<LeaguePageData>(`/api/sport/leagues/${leagueId}${qs}`, 120)
})

export const fetchEsportsTeamSSR = cache(async (teamId: string) => {
  return serverFetch<EsportsTeamPageData>(`/api/esports/teams/${teamId}`, 300)
})

export const fetchEventDetailSSR = cache(async (id: string) => {
  return serverFetch<unknown>(`/api/events/${id}`, 60)
})

export const fetchMarketsListSSR = cache(async (params: Record<string, string | number> = {}) => {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v))
  const query = qs.toString()
  return serverFetch<Market[]>(`/api/markets${query ? '?' + query : ''}`, 60)
})
