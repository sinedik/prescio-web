// ---- API types ----

export interface Market {
  platform: string
  id?: string
  slug?: string
  conditionId?: string
  clobTokenId?: string
  question: string
  outcome_label?: string | null
  description?: string
  yesPrice: number
  noPrice?: number
  volume: number
  volume24h?: number
  liquidity?: number
  resolutionDate: string
  resolutionCriteria?: string
  tags?: string[]
  category?: string
  url: string
  // Kalshi-specific
  ticker?: string
  // Event context (enrichment)
  event?: {
    id: string
    title: string
    image_url?: string | null
    description?: string | null
    total_volume?: number | null
    market_count?: number | null
    tradable_count?: number | null
    enrichment_status?: 'pending' | 'ready' | 'failed'
  } | null
  // Price history: last 24h snapshots (from /api/markets). {t: unix seconds, p: 0-100}
  price_history?: { t: number; p: number }[]
  // Fresh AI analysis signal (from /api/markets). Null if no valid analysis.
  ai?: {
    edge: number | null
    recommendation: string | null
    confidence: string | null
    fairProb: number | null
  } | null
}

export interface KellySizing {
  betSize: number
  edge: number
  kellyFull: number
  kellyUsed: number
  potentialWin: number
}

export interface Analysis {
  fairProb: number
  marketProb: number
  edge: number
  edgeDirection: 'YES' | 'NO' | 'NONE'
  confidence: number | string
  confidenceScore?: number
  category?: string
  horizon?: string
  liquidity?: string
  thesis: string
  resolutionNote: string
  crowdBias: string
  action: string
  actionReason?: string
  kellySizing: KellySizing | string | null
  similarMarkets?: Array<{ question: string; platform: string }>
}

export interface NewsItem {
  source: string
  title: string
  summary: string
  url: string
  publishedAt?: string
}

export interface MetaculusMatch {
  platform?: string
  id?: string | number
  question?: string
  communityProb: number | null
  numForecasters: number
  numPredictions?: number
  url: string
}

export interface MarketOpportunity {
  market: Market
  analysis: Analysis
  news?: NewsItem[]
  metaculusMatch?: MetaculusMatch | null
}

export interface FeedResponse {
  markets?: MarketOpportunity[]
  opportunities?: MarketOpportunity[]
  cachedAt?: string
  scannedAt?: string
  scanDuration?: number
  fromCache?: boolean
  scanning?: boolean
  lastScannedAt?: string
}

export type SortField = 'edge' | 'volume' | 'confidence' | 'resolution'
export type FilterPlatform = 'all' | 'polymarket' | 'metaculus' | 'kalshi' | 'grid'

// ---- Esports (GRID) ----
export interface EsportsTeam {
  id?: string
  name: string
  score?: number | null
  logoUrl?: string | null
  colorPrimary?: string | null
  colorSecondary?: string | null
}

export interface EsportsInventoryItem {
  id: string
  name?: string | null
  quantity?: number
  equipped?: number | null
}

export interface EsportsPlayer {
  id: string
  name?: string
  nickname?: string | null
  kills: number
  deaths: number
  assists: number
  netWorth?: number | null
  money?: number | null
  firstKill?: boolean
  // CS2-specific
  alive?: boolean | null
  currentHealth?: number | null
  currentArmor?: number | null
  loadoutValue?: number | null
  headshots?: number | null
  damageDealt?: number | null
  damageTaken?: number | null
  position?: { x: number; y: number } | null
  inventory?: EsportsInventoryItem[] | null
  multikills?: { numberOfKills: number; count: number }[] | null
  topWeapons?: { weaponName: string | null; count: number }[] | null
}

export interface EsportsGameTeam {
  id?: string
  name?: string
  side?: string | null
  won?: boolean
  score?: number
  kills?: number | null
  deaths?: number | null
  netWorth?: number | null
  money?: number | null
  // CS2-specific
  loadoutValue?: number | null
  headshots?: number | null
  damageDealt?: number | null
  damageTaken?: number | null
  multikills?: { numberOfKills: number; count: number }[] | null
  players?: EsportsPlayer[]
}

export interface EsportsDraftAction {
  type: string
  seq: string
  teamId?: string | null
  drafterType?: string | null
  heroId?: string | null
  heroName?: string | null
  heroImg?: string | null
  itemType?: string | null
}

export interface EsportsRoundPlayer {
  id: string
  name?: string | null
  kills: number
  deaths: number
  assists?: number
  firstKill?: boolean
  alive?: boolean | null
  currentHealth?: number | null
  currentArmor?: number | null
  headshots?: number | null
  damageDealt?: number | null
}

export interface EsportsRoundTeam {
  id?: string
  name?: string
  side?: string | null
  won: boolean
  winType?: string | null
  kills: number
  deaths: number
  firstKill?: boolean
  headshots?: number | null
  damageDealt?: number | null
  bombPlanted?: boolean
  bombDefused?: boolean
  bombExploded?: boolean
  players: EsportsRoundPlayer[]
}

export interface EsportsRound {
  round: number
  started: boolean
  finished: boolean
  phase?: 'warmup' | 'freeze' | 'live' | 'finished'
  startedAt?: string | null
  duration?: string | null
  teamA: EsportsRoundTeam | null
  teamB: EsportsRoundTeam | null
}

export interface EsportsGame {
  seq: number
  map: string | null
  started: boolean
  finished: boolean
  paused?: boolean
  startedAt?: string | null
  duration?: string | null
  clock?: { currentSeconds: number; ticking: boolean; ticksBackwards?: boolean } | null
  draft?: EsportsDraftAction[]
  rounds: EsportsRound[]
  teamA: EsportsGameTeam | null
  teamB: EsportsGameTeam | null
}

export interface EsportsTeamDetail extends EsportsTeam {
  logoUrl?: string | null
  colorPrimary?: string | null
  colorSecondary?: string | null
  players?: EsportsPlayer[]
}

export interface EsportsMatch {
  id: string
  marketId: string
  teamA: EsportsTeam
  teamB: EsportsTeam
  tournament: string
  format: string
  startsAt: string
  yesPrice: number
  noPrice: number
  status: 'upcoming' | 'live' | 'finished'
  games: EsportsGame[]
  steamData: { seriesId: number; games: unknown[] } | null
}

export interface EsportsMarket {
  id: string
  type: string
  mapNumber?: number | null
  yesPrice: number
  noPrice: number
  status?: string
  question?: string | null
}

export interface EsportsDotaPlayer {
  steamAccountId: number
  name?: string | null
  isRadiant: boolean
  heroId?: number
  heroName?: string | null
  heroImg?: string | null
  kills: number
  deaths: number
  assists: number
  gold?: number
  gpm?: number
  xpm?: number
  level?: number
  networth?: number
  items?: { id: number; name?: string | null; img?: string | null }[]
  itemTimeline?: { time: number; itemId: number; name?: string | null; img?: string | null }[]
  respawnTimer?: number | null
  ultimateState?: number | null
  posX?: number | null
  posY?: number | null
}

export interface EsportsDotaLive {
  matchId?: number | null
  gameTime?: number | null
  radiantScore?: number | null
  direScore?: number | null
  radiantLead?: number | null
  spectators?: number
  roshanRespawnTimer?: number | null
  buildingState?: {
    radiant: { towers: boolean[]; barracks: boolean[] }
    dire: { towers: boolean[]; barracks: boolean[] }
  } | null
  winRates?: { time: number; winRate: number }[]
  insight?: {
    teamOneVsWinCount?: number
    teamTwoVsWinCount?: number
    teamOneLeagueWinCount?: number
    teamOneLeagueMatchCount?: number
    teamTwoLeagueWinCount?: number
    teamTwoLeagueMatchCount?: number
  } | null
  players?: EsportsDotaPlayer[]
  roshanEvents?: { time: number; isAlive: boolean }[]
  buildingEvents?: {
    time: number
    type?: string | null
    isAlive?: boolean | null
    isRadiant?: boolean | null
    npcId?: number | null
  }[]
  killTimeline?: {
    time: number
    isRadiant: boolean
    heroId?: number | null
    heroName?: string | null
    heroImg?: string | null
  }[]
}

export interface EsportsRecentMatch {
  seriesId: string
  startsAt: string
  format: string | null
  tournament: string | null
  tournamentId: string | null
  opponent: { id: string; name: string } | null
  outcome: 'W' | 'L' | null
  scoreSelf: number | null
  scoreOpp: number | null
  finished: boolean
}

export interface EsportsTournamentMeta {
  id: string
  name: string
  nameShortened?: string | null
  logoUrl?: string | null
  startDate?: string | null
  endDate?: string | null
  prizePool?: number | null
}

export interface EsportsPreMatch {
  tournament: EsportsTournamentMeta | null
  streams: string[]
  externalLinks: { provider: string | null; id: string | null }[]
  recentA: EsportsRecentMatch[]
  recentB: EsportsRecentMatch[]
  h2h: {
    winsA: number
    winsB: number
    matches: EsportsRecentMatch[]
  }
}

export interface EsportsMatchDetail extends EsportsMatch {
  subcategory: string
  streams?: string[]
  teamA: EsportsTeamDetail
  teamB: EsportsTeamDetail
  draft?: EsportsDraftAction[]
  markets: EsportsMarket[]
  liveState: { startedAt?: string; duration?: string; updatedAt?: string } | null
  dotaLive?: EsportsDotaLive | null
  preMatch?: EsportsPreMatch | null
}

export interface EsportsTeamPageData {
  meta: {
    id: string
    name: string
    nameShortened?: string | null
    logoUrl?: string | null
    colorPrimary?: string | null
    colorSecondary?: string | null
  } | null
  roster: Array<{ id: string; nickname: string }>
  matches: Array<{
    id: string
    marketId: string
    teamA: EsportsTeam
    teamB: EsportsTeam
    tournament: string
    format: string
    startsAt: string
    yesPrice: number
    noPrice: number
    status: string
    subcategory: string
  }>
  form?: Array<{
    seriesId: string
    startsAt: string
    outcome: 'W' | 'L'
    opponent?: { id: string; name: string } | null
  }>
  stats?: {
    wins: number
    losses: number
    winrate: number | null
  }
  mapStats?: Record<string, { wins: number; losses: number }>
}

// ---- Portfolio types ----

export type PositionStatus = 'open' | 'won' | 'lost'
export type PositionDirection = 'YES' | 'NO'

export interface Position {
  id: string
  // market info
  question: string
  platform: string
  topic: string
  url?: string
  resolutionDate?: string
  // trade params
  direction: PositionDirection
  entryPrice: number     // 0–100 (%)
  myFairProb: number     // 0–100 (%)
  amount: number         // $ invested
  // meta
  thesis: string
  ai_edge_at_entry?: number  // pp edge at time of entry (Alpha)
  status: PositionStatus
  createdAt: string      // ISO
  closedAt?: string      // ISO
  closePrice?: number    // 0–100 (%) — final price at resolution
}
