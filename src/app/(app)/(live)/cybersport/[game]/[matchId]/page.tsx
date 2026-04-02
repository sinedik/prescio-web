import type { Metadata } from 'next'
import CybersportScreen from '@/screens/CybersportScreen'
import type { Game } from '@/screens/CybersportScreen'

const VALID_GAMES: Game[] = ['cs2', 'dota2']

interface Props { params: Promise<{ game: string; matchId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game, matchId } = await params
  const label = game === 'dota2' ? 'Dota 2' : 'CS2'
  return {
    title: `Match ${matchId} — ${label}`,
    description: `Live ${label} match stats and AI analysis on Prescio.`,
    robots: { index: false },
  }
}

export default async function CybersportMatchPage({ params }: Props) {
  const { game, matchId } = await params
  const safeGame: Game = VALID_GAMES.includes(game as Game) ? (game as Game) : 'cs2'
  return <CybersportScreen key={safeGame} initialGame={safeGame} matchId={matchId} />
}
