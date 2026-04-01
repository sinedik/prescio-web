import type { Metadata } from 'next'
import { FeedScreen } from '@/screens/FeedScreen'

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Browse aggregated prediction markets from Kalshi, Polymarket and Metaculus. Filter by category, sort by edge signal or volume.',
}

export default FeedScreen
