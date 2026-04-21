import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import HowItWorksClient from './HowItWorksClient'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'How it works | Prescio',
  description: 'AI cross-references primary sources against crowd probability — across prediction markets, sports, and esports.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/how-it-works` },
  openGraph: {
    title: 'How it works | Prescio',
    description: 'How Prescio finds the edge: primary sources, probability models, and alerts.',
    url: `${site}/how-it-works`,
    type: 'website',
  },
}

export default function HowItWorksPage() {
  return <HowItWorksClient />
}
