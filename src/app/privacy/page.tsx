import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import PrivacyClient from './PrivacyClient'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Privacy Policy | Prescio',
  description: 'How Prescio collects, uses, and protects your personal data.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/privacy` },
  openGraph: {
    title: 'Privacy Policy | Prescio',
    description: 'How Prescio collects, uses, and protects your personal data.',
    url: `${site}/privacy`,
    type: 'website',
  },
}

export default function PrivacyPage() {
  return <PrivacyClient />
}
