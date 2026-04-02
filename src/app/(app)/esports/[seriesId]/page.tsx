import type { Metadata } from 'next'
import EsportsMatchScreen from '@/screens/EsportsMatchScreen'

interface Props { params: Promise<{ seriesId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { seriesId } = await params
  return {
    title: `Match ${seriesId} — Esports`,
    description: 'Live esports match details, map scores and win probability on Prescio.',
    robots: { index: false },
  }
}

export default async function EsportsMatchPage({ params }: Props) {
  const { seriesId } = await params
  return <EsportsMatchScreen seriesId={seriesId} />
}
