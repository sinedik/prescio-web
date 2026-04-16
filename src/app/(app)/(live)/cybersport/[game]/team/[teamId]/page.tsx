import type { Metadata } from 'next'
import EsportsTeamScreen from '@/screens/EsportsTeamScreen'
import type { Game } from '@/screens/CybersportScreen'
import { fetchEsportsTeamSSR } from '@/lib/serverData'

const VALID_GAMES: Game[] = ['cs2', 'dota2']

interface Props { params: Promise<{ game: string; teamId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game, teamId } = await params
  const label = game === 'dota2' ? 'Dota 2' : 'CS2'
  const data = await fetchEsportsTeamSSR(teamId)
  const teamName = data?.meta?.name ?? data?.meta?.nameShortened ?? `Team ${teamId}`
  return {
    title: `${teamName} — ${label}`,
    description: `${label} team page for ${teamName} — roster and matches on Prescio.`,
    robots: { index: false },
  }
}

export default async function EsportsTeamPage({ params }: Props) {
  const { game, teamId } = await params
  const safeGame: Game = VALID_GAMES.includes(game as Game) ? (game as Game) : 'cs2'
  const initialData = await fetchEsportsTeamSSR(teamId)
  return <EsportsTeamScreen teamId={teamId} game={safeGame} initialData={initialData ?? undefined} />
}
