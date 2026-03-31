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
  sport_odds?: SportOdds[]
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
  sort: 'recent' | 'score' | 'starts_at'
}
