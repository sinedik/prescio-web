// ---- API types ----

export interface Market {
  platform: string
  id?: string
  slug?: string
  conditionId?: string
  clobTokenId?: string
  question: string
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
export type FilterPlatform = 'all' | 'polymarket' | 'metaculus' | 'kalshi'

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
  status: PositionStatus
  createdAt: string      // ISO
  closedAt?: string      // ISO
  closePrice?: number    // 0–100 (%) — final price at resolution
}
