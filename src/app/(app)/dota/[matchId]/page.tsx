import type { Metadata } from 'next'
import DotaMatchScreen from '@/screens/DotaMatchScreen'

interface Props { params: Promise<{ matchId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { matchId } = await params
  return {
    title: `Match ${matchId} — Dota 2`,
    description: 'Live Dota 2 pro match stats, minimap, draft and AI analysis on Prescio.',
    robots: { index: false },
  }
}

export default async function DotaMatchPage({ params }: Props) {
  const { matchId } = await params
  return <DotaMatchScreen matchId={matchId} />
}
