export interface DotaHero {
  id: number
  name: string
  localizedName: string
  primaryAttr: 'str' | 'agi' | 'int' | 'all'
  attackType: 'Melee' | 'Ranged'
  img: string
  icon: string
}

export interface DotaTeam {
  id: number | null
  name: string
  logo: string | null
  seriesWins?: number
}

export interface DotaLivePlayer {
  // Core — available from both STRATZ and Valve Realtime
  steamAccountId: number
  heroId: number
  isRadiant: boolean
  name: string | null
  numKills: number
  numDeaths: number
  numAssists: number
  numLastHits: number
  gold: number
  networth: number
  level: number
  respawnTimer: number
  posX: number | null
  posY: number | null
  // STRATZ-only (may be absent when using Valve Realtime fallback)
  playerSlot?: number
  numDenies?: number
  goldPerMinute?: number
  experiencePerMinute?: number
  heroDamage?: number
  towerDamage?: number
  items?: number[]
  ultimateState?: number
  ultimateCooldown?: number
  position?: string | null
  baseWinRateValue?: number | null
}

export interface DotaPickBan {
  isPick: boolean
  heroId: number | null
  isRadiant: boolean | null
  order: number | null
  heroName: string | null
  heroImg: string | null
  baseWinRate?: number | null
  adjustedWinRate?: number | null
}

export interface DotaRoshanEvent {
  time: number
  isAlive: boolean
  respawnTimer: number | null
}

export interface DotaBuildingState {
  radiant: { t1: [boolean, boolean, boolean]; t2: [boolean, boolean, boolean] }
  dire:    { t1: [boolean, boolean, boolean]; t2: [boolean, boolean, boolean] }
}

export interface DotaLiveMatch {
  matchId: number
  gameTime: number
  gameState: string
  completed: boolean
  radiantScore: number
  direScore: number
  radiantLead: number
  spectators: number
  liveWinRates: Array<{ time: number; winRate: number }>
  buildingState: DotaBuildingState | null
  players: DotaLivePlayer[]
  pickBans: DotaPickBan[]
  roshanEvents: DotaRoshanEvent[]
  buildingEvents: Array<{ time: number; type: string | null; isAlive: boolean; isRadiant: boolean | null }>
  insight: {
    teamOneVsWinCount: number
    teamTwoVsWinCount: number
    teamOneLeagueWinCount: number
    teamOneLeagueMatchCount: number
    teamTwoLeagueWinCount: number
    teamTwoLeagueMatchCount: number
  } | null
  hasPositions: boolean
}

export interface DotaLiveGame {
  matchId: number
  gameNumber: number
  isLive: boolean
  gameTime?: number
  radiantKills?: number
  direKills?: number
  goldAdvantage?: number
  buildingState?: number
  serverSteamId?: string
  radiantPlayers?: unknown[]
  direPlayers?: unknown[]
  finished?: {
    radiantWin: boolean
    radiantScore: number
    direScore: number
    duration: number
    winnerTeamId: number
  }
}

export interface DotaSeries {
  seriesId: number
  seriesType: number
  leagueId: number
  leagueName: string
  teamRadiant: DotaTeam
  teamDire: DotaTeam
  games: DotaLiveGame[]
  spectators: number
}

export interface DotaProMatch {
  matchId: number
  duration: number
  startTime: number
  leagueId: number | null
  leagueName: string | null
  seriesId: number | null
  seriesType: number | null
  radiantTeamId: number | null
  radiantName: string | null
  direTeamId: number | null
  direName: string | null
  radiantScore: number
  direScore: number
  radiantWin: boolean | null
}

export interface DotaMatchPlayer {
  steamAccountId: number
  isRadiant: boolean
  isVictory: boolean
  heroId: number
  heroName: string
  heroImg: string | null
  kills: number
  deaths: number
  assists: number
  networth: number
  gpm: number
  xpm: number
  level: number
  lastHits: number
  denies: number
  heroDamage: number
  towerDamage: number
  heroHealing: number | null
  lane: string | null
  position: string | null
  role: string | null
  items: number[]
  neutralItem: number | null
  name: string | null
  teamName: string | null
  networthPerMin: number[] | null
  killEvents: Array<{ time: number; positionX: number | null; positionY: number | null }> | null
}

export interface DotaMatchDetail {
  matchId: number
  didRadiantWin: boolean | null
  duration: number | null
  startTime: number | null
  firstBloodTime: number | null
  leagueId: number | null
  leagueName: string | null
  seriesId: number | null
  radiantTeam: { id: number | null; name: string | null; logo: string | null }
  direTeam: { id: number | null; name: string | null; logo: string | null }
  radiantNetworthLeads: number[] | null
  radiantXpLeads: number[] | null
  winRates: number[] | null
  radiantKillsPerMin: number[] | null
  direKillsPerMin: number[] | null
  pickBans: DotaPickBan[]
  laneOutcomes: { top: string | null; mid: string | null; bot: string | null } | null
  roshanEvents: DotaRoshanEvent[]
  players: DotaMatchPlayer[]
}
