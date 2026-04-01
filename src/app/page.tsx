import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import { LandingJsonLd } from '@/components/seo/LandingJsonLd'
import LandingClient from './LandingClient'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  title: 'Prescio — AI Edge Detection for Prediction Markets',
  description:
    'Prescio aggregates Kalshi, Polymarket and Metaculus in one place and uses AI to find where the market is wrong. Free to track, Pro to get the edge.',
  alternates: { canonical: siteUrl },
  openGraph: {
    url: siteUrl,
    title: 'Prescio — AI Edge Detection for Prediction Markets',
    description:
      'One platform. Kalshi, Polymarket, Metaculus, sports odds and esports. AI finds where the market is wrong — you act on it.',
  },
}

export default function HomePage() {
  return (
    <>
      <LandingJsonLd />
      <LandingClient />
    </>
  )
}
