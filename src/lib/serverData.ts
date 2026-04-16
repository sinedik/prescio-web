// Server-only data fetchers for SSR (Server Components).
// Provide lightweight first-paint data; client polling hydrates the full payload.
// Do not import from client components.

import { supabase } from './supabase'
import type { EsportsMatch } from '../types'
import type { SportEvent } from '../types/index'

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

export async function fetchEsportsListSSR(game: string, window: string): Promise<EsportsMatch[]> {
  const subcats = GAME_SUBCATEGORIES[game]
  if (!subcats) return []

  const now = Date.now()
  const from = new Date(now - 6 * 3600_000).toISOString()
  const horizon = window === 'live' ? 0 : window === '1h' ? 1 : window === '3h' ? 3 : window === '12h' ? 12 : 48
  const to   = new Date(now + horizon * 3600_000).toISOString()

  try {
    const { data } = await supabase
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
  } catch {
    return []
  }
}

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

export async function fetchSportEventsSSR(subcategory: string): Promise<SportEvent[]> {
  const from = new Date(); from.setHours(0, 0, 0, 0)
  const to   = new Date(from); to.setDate(to.getDate() + 30); to.setHours(23, 59, 59, 999)

  try {
    const { data } = await supabase
      .from('sport_events')
      .select('id,source,category,subcategory,league,home_team,away_team,starts_at,status,home_score,away_score,raw_data,sport_odds(bookmaker,market_type,outcomes)')
      .eq('subcategory', subcategory)
      .gte('starts_at', from.toISOString())
      .lte('starts_at', to.toISOString())
      .order('starts_at', { ascending: true })
      .limit(100)

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
  } catch {
    return []
  }
}
