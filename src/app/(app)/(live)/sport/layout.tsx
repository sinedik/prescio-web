import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Sport',
  description:
    'Live and upcoming sport fixtures — football, basketball, tennis, MMA — with odds, form and AI insights.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/sport/football` },
  openGraph: {
    title: 'Sport | Prescio',
    description:
      'Live and upcoming sport fixtures — football, basketball, tennis, MMA — with odds, form and AI insights.',
    url: `${site}/sport/football`,
    type: 'website',
  },
}

export default function SportLayout({ children }: { children: React.ReactNode }) {
  return children
}
