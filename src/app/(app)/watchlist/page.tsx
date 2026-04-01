import type { Metadata } from 'next'
import WatchlistPage from '@/screens/WatchlistPage'

export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'Your saved prediction market events and markets.',
  robots: { index: false },
}

export default WatchlistPage
