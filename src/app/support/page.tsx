import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import SupportClient from './SupportClient'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Support | Prescio',
  description: 'Get help with Prescio — contact support, billing, and account issues.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/support` },
  openGraph: {
    title: 'Support | Prescio',
    description: 'Get help with Prescio.',
    url: `${site}/support`,
    type: 'website',
  },
}

export default function SupportPage() {
  return <SupportClient />
}
