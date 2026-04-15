import type { Metadata } from 'next'
import EsportsTeamScreen from '@/screens/EsportsTeamScreen'
import type { Game } from '@/screens/CybersportScreen'

const VALID_GAMES: Game[] = ['cs2', 'dota2', 'valorant']

interface Props { params: Promise<{ game: string; teamId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game, teamId } = await params
  const label = game === 'dota2' ? 'Dota 2' : game === 'valorant' ? 'Valorant' : 'CS2'
  return {
    title: `Team ${teamId} — ${label}`,
    description: `${label} team page — roster and matches on Prescio.`,
    robots: { index: false },
  }
}

export default async function EsportsTeamPage({ params }: Props) {
  const { game, teamId } = await params
  const safeGame: Game = VALID_GAMES.includes(game as Game) ? (game as Game) : 'cs2'
  return <EsportsTeamScreen teamId={teamId} game={safeGame} />
}
