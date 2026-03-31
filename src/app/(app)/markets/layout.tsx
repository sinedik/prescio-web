import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Markets',
  description:
    'Browse prediction markets from Polymarket, Kalshi, and Metaculus — volume, odds, and AI edge signals.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/markets` },
  openGraph: {
    title: 'Markets | Prescio',
    description:
      'Browse prediction markets from Polymarket, Kalshi, and Metaculus — volume, odds, and AI edge signals.',
    url: `${site}/markets`,
    type: 'website',
  },
}

export default function MarketsLayout({ children }: { children: React.ReactNode }) {
  return children
}
