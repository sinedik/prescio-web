import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import PricingClient from './PricingClient'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Pricing | Prescio',
  description: 'Free to track. Pro to get the edge. AI-powered intelligence for prediction markets, sports, esports, and crypto.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/pricing` },
  openGraph: {
    title: 'Pricing | Prescio',
    description: 'Free to track. Pro to get the edge.',
    url: `${site}/pricing`,
    type: 'website',
  },
}

export default function PricingPage() {
  return <PricingClient />
}
