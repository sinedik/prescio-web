import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import CybersportMatchOnly from '@/screens/CybersportMatchOnly'
import type { Game } from '@/screens/CybersportScreen'
import type { EsportsMatchDetail } from '@/types'
import { fetchEsportsMatchSSR } from '@/lib/serverData'

const VALID_GAMES: Game[] = ['cs2', 'dota2']

interface Props { params: Promise<{ game: string; matchId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { game, matchId } = await params
  const label = game === 'dota2' ? 'Dota 2' : 'CS2'
  const siteUrl = getSiteUrl()
  const canonical = `${siteUrl}/cybersport/${game}/${matchId}`

  let title = `Match ${matchId} — ${label}`
  let description = `Live ${label} match stats and AI analysis on Prescio.`
  let imageUrl: string | undefined

  const m = await fetchEsportsMatchSSR(matchId) as { teamA?: { name?: string; logoUrl?: string | null }; teamB?: { name?: string; logoUrl?: string | null }; tournament?: string } | null
  const aName = m?.teamA?.name
  const bName = m?.teamB?.name
  const tour = m?.tournament
  if (aName && bName) {
    title = `${aName} vs ${bName} — ${label}`
    description = tour
      ? `${aName} vs ${bName} · ${tour}. Live ${label} stats and AI edge on Prescio.`
      : `${aName} vs ${bName}. Live ${label} stats and AI edge on Prescio.`
  }
  imageUrl = m?.teamA?.logoUrl ?? m?.teamB?.logoUrl ?? undefined

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Prescio`,
      description,
      url: canonical,
      type: 'article',
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Prescio`,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    robots: { index: false },
  }
}

export default async function CybersportMatchPage({ params }: Props) {
  const { game, matchId } = await params
  const safeGame: Game = VALID_GAMES.includes(game as Game) ? (game as Game) : 'cs2'
  const initialData = await fetchEsportsMatchSSR(matchId) as EsportsMatchDetail | null
  return <CybersportMatchOnly game={safeGame} matchId={matchId} initialData={initialData ?? undefined} />
}
