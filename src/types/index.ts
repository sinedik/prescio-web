export type SubscriptionPlan = 'free' | 'pro' | 'alpha'

export type TopCategory =
  | 'crypto' | 'politics' | 'economics'
  | 'sport' | 'esports' | 'science_tech'

export type SourceType = 'prediction' | 'sport'

export type SourceName =
  | 'polymarket' | 'kalshi' | 'metaculus'
  | 'odds_api' | 'pandascore' | 'user_search'

export interface UnifiedEvent {
  id: string
  source_id?: string
  source_type: SourceType
  source_name: SourceName
  category: TopCategory
  subcategory?: string
  title: string
  description?: string
  image_url?: string
  starts_at?: string
  status: string
  ai_score?: number
  enriched_at?: string
  created_at: string
  event_analyses?: EventAnalysis[]
  market_analyses?: MarketAnalysis[]
  event_links?: EventLink[]
  sport_odds?: SportOdds[]
}

export interface SportEvent {
  id: string
  external_id: string
  source: 'odds_api' | 'pandascore'
  category: TopCategory
  subcategory: string
  league?: string
  home_team: string
  away_team: string
  starts_at: string
  status: 'scheduled' | 'live' | 'finished' | 'canceled'
  home_score?: number
  away_score?: number
  raw_data?: Record<string, unknown> | null
  sport_odds?: SportOdds[]
  linked_prediction_markets?: { id: string; source_id: string; source_name: string; title: string }[]
}

export interface SportOdds {
  id: string
  sport_event_id: string
  bookmaker: string
  market_type: 'h2h' | 'spreads' | 'totals' | 'btts' | 'asian_handicap'
  outcomes: OddsOutcome[]
  ai_value?: AiValue
  fetched_at: string
}

export interface OddsOutcome {
  name: string
  price: number
  point?: number
}

export interface SportPrediction {
  id: string
  fixture_id: number
  sport_event_id: string
  winner_name: string | null
  winner_comment: string | null
  advice: string | null
  home_pct: number
  draw_pct: number
  away_pct: number
  comparison: {
    form:                { home: string; away: string }
    att:                 { home: string; away: string }
    def:                 { home: string; away: string }
    poisson_distribution:{ home: string; away: string }
    h2h:                 { home: string; away: string }
    goals:               { home: string; away: string }
    total:               { home: string; away: string }
  } | null
  home_last5: {
    played: number; form: string; att: string; def: string
    goals: { for: { total: number; average: string }; against: { total: number; average: string } }
  } | null
  away_last5: {
    played: number; form: string; att: string; def: string
    goals: { for: { total: number; average: string }; against: { total: number; average: string } }
  } | null
  h2h: Array<{
    fixture: { id: number; date: string }
    teams: { home: { id: number; name: string; logo: string }; away: { id: number; name: string; logo: string } }
    goals: { home: number | null; away: number | null }
    score: { fulltime: { home: number | null; away: number | null } }
  }> | null
  fetched_at: string
}

export interface SportStanding {
  id: string
  team_external_id: number
  league_id: number
  season: number
  rank: number
  points: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_diff: number
  form: string
  played: number
  description: string | null
  team_name: string
  team_logo: string | null
  home_wins: number; home_draws: number; home_losses: number
  away_wins: number; away_draws: number; away_losses: number
}

export interface SportInjury {
  id: string
  league_id: number
  season: number
  player_id: number
  player_name: string | null
  player_photo: string | null
  team_external_id: number | null
  team_name: string | null
  team_logo: string | null
  reason: string | null
  type: string | null
  fixture_date: string | null
}

export interface PlayerStats {
  team:     { id: number; name: string; logo: string | null }
  league:   { id: number; name: string; logo: string | null; country: string | null }
  season:   number
  games:    { appearances: number | null; lineups: number | null; minutes: number | null; position: string | null; rating: string | null; captain: boolean | null }
  goals:    { total: number; assists: number; saves: number | null; conceded: number | null }
  shots:    { total: number; on: number }
  passes:   { total: number; key: number; accuracy: string | null }
  tackles:  { total: number; blocks: number; interceptions: number }
  dribbles: { attempts: number; success: number }
  duels:    { total: number; won: number }
  fouls:    { drawn: number; committed: number }
  cards:    { yellow: number; yellowred: number; red: number }
  penalty:  { scored: number; missed: number }
}

export interface PlayerProfile {
  id:          number
  name:        string
  firstname:   string | null
  lastname:    string | null
  age:         number | null
  birth_date:  string | null
  nationality: string | null
  height:      string | null
  weight:      string | null
  photo:       string | null
  injured:     boolean
  statistics:  PlayerStats[]
}

export interface SportTeam {
  id: string
  external_id: number
  subcategory: string
  name: string
  code: string | null
  logo: string | null
  country: string | null
  founded: number | null
  venue_name: string | null
  venue_city: string | null
  venue_capacity: number | null
  venue_image: string | null
  updated_at: string
}

export interface TeamFixture {
  fixture_id: number
  date: string
  league: string
  league_logo: string | null
  is_home: boolean
  opponent: string
  opponent_logo: string | null
  my_goals: number | null
  opp_goals: number | null
  result: 'W' | 'D' | 'L'
  status: string
}

export interface SportLineupPlayer {
  id: number
  name: string
  number: number | null
  pos: string | null
  grid: string | null
}

export interface SportLineup {
  team_id: number
  team_name: string
  formation: string | null
  coach_name: string | null
  start_xi: SportLineupPlayer[]
  substitutes: SportLineupPlayer[]
  fetched_at: string
}

export interface SportFixtureStat {
  team_id: number
  team_name: string
  stats: Record<string, string | number | null>
  fetched_at: string
}

export interface SportMatchEvent {
  minute: number | null
  extra: number | null
  team_id: number | null
  team: string | null
  player: string | null
  assist: string | null
  type: string
  detail: string
}

export interface SportSquadPlayer {
  player_id: number
  player_name: string
  player_photo: string | null
  age: number | null
  position: string | null
  number: number | null
}

export interface SportTopScorer {
  rank: number
  player_id: number
  player_name: string
  player_photo: string | null
  team_name: string | null
  team_logo: string | null
  goals: number
  assists: number
  appearances: number
  yellow_cards: number
  red_cards: number
}

export interface AiValue {
  value_rating: number
  suggested_side?: string
  confidence: number
  reasoning?: string
}

export interface EventAnalysis {
  id: string
  event_id: string
  summary?: string
  key_factors?: KeyFactor[]
  probability?: { yes: number; no: number; confidence: string }
  edge_score?: number
  kelly_fraction?: number
  scenarios?: Scenario[]
  expires_at: string
}

export interface MarketAnalysis {
  id: string
  market_id: string
  recommendation?: string
  confidence?: number
  edge_score?: number
  expires_at: string
}

export interface EventLink {
  event_b_id: string
  link_type: 'same_match' | 'related'
  confidence: number
}

export interface KeyFactor {
  factor: string
  impact: 'high' | 'medium' | 'low'
  direction: 'bullish' | 'bearish' | 'neutral'
}

export interface Scenario {
  name: string
  probability: number
  description: string
}

export interface UserProfile {
  id: string
  email: string
  username?: string
  avatar_url?: string
  onboarding_done: boolean
  subscriptions?: { plan: SubscriptionPlan; status: string; current_period_end?: string }[]
  usage?: { analyses_used: number; ai_searches_used: number }
}

export interface UserInterest {
  category: TopCategory
  subcategory?: string
  weight: number
}

export interface UserSearch {
  id: string
  query: string
  ai_summary?: string
  dynamic_event?: DynamicEvent
  analysis_queued: boolean
  unified_event_id?: string
  category?: TopCategory
  created_at: string
}

export interface DynamicEvent {
  title: string
  summary: string
  key_factors?: KeyFactor[]
  probability?: { yes: number; no: number; confidence: string }
  edge_score?: number
  category: TopCategory
}

export interface FeedFilters {
  category?: TopCategory
  subcategory?: string
  source_name?: SourceName
  sort: 'recent' | 'score' | 'starts_at'
}
