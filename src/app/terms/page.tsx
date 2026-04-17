import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import TermsClient from './TermsClient'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Terms of Service | Prescio',
  description: 'Terms and conditions governing use of Prescio.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/terms` },
  openGraph: {
    title: 'Terms of Service | Prescio',
    description: 'Terms and conditions governing use of Prescio.',
    url: `${site}/terms`,
    type: 'website',
  },
}

export default function TermsPage() {
  return <TermsClient />
}
