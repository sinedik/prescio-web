import type { Metadata } from 'next'
import MarketsPage from '@/screens/MarketsPage'
import { fetchMarketsListSSR } from '@/lib/serverData'

export const metadata: Metadata = {
  title: 'Markets',
  description: 'All prediction markets from Kalshi, Polymarket and Metaculus in one place. Sort by edge, volume or recency.',
}

export const revalidate = 60

export default async function MarketsRoute() {
  const initialMarkets = await fetchMarketsListSSR({ limit: 50 })
  return <MarketsPage initialMarkets={initialMarkets ?? undefined} />
}
