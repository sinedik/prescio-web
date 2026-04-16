import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Esports',
  description:
    'Live and upcoming CS2 and Dota 2 matches — series, maps, odds and AI insights.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/cybersport/cs2` },
  openGraph: {
    title: 'Esports | Prescio',
    description:
      'Live and upcoming CS2 and Dota 2 matches — series, maps, odds and AI insights.',
    url: `${site}/cybersport/cs2`,
    type: 'website',
  },
}

export default function CybersportLayout({ children }: { children: React.ReactNode }) {
  return children
}
