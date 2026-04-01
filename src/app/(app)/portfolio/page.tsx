import type { Metadata } from 'next'
import PortfolioPage from '@/screens/PortfolioPage'

export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Track your positions across Polymarket, Kalshi and other prediction markets.',
  robots: { index: false },
}

export default PortfolioPage
