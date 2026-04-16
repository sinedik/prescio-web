import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import CybersportScreen from '@/screens/CybersportScreen'
import type { Game } from '@/screens/CybersportScreen'

interface Props { params: Promise<{ game: string }> }

const GAME_META: Record<string, { title: string; description: string }> = {
  cs2: {
    title: 'CS2 — Live Matches & AI Esports Analytics',
    description: 'Live CS2 matches with AI-powered win probability, team stats and edge signals. Catch mispriced esports odds on Prescio.',
  },
  dota2: {
    title: 'Dota 2 — Live Matches & AI Esports Analytics',
    description: 'Live Dota 2 matches with real-time AI analysis, hero stats and edge detection. Find value in esports markets on Prescio.',
  },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game } = await params
  const siteUrl = getSiteUrl()
  const meta = GAME_META[game] ?? {
    title: 'Esports — Live Matches & AI Analytics',
    description: 'Live esports matches with AI analysis and edge signals on Prescio.',
  }
  const canonical = `${siteUrl}/cybersport/${game}`
  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical,
      languages: { en: canonical, ru: canonical, 'x-default': canonical },
    },
    openGraph: { title: `${meta.title} | Prescio`, description: meta.description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title: `${meta.title} | Prescio`, description: meta.description },
  }
}

const VALID_GAMES: Game[] = ['cs2', 'dota2']

export default async function CybersportGamePage({ params }: Props) {
  const { game } = await params
  const safeGame: Game = VALID_GAMES.includes(game as Game) ? (game as Game) : 'cs2'
  return <CybersportScreen key={safeGame} initialGame={safeGame} />
}
