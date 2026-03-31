import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteUrl } from '@/lib/site'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms governing use of Prescio.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/terms` },
  openGraph: {
    title: 'Terms of Service | Prescio',
    description: 'Terms governing use of Prescio.',
    url: `${site}/terms`,
    type: 'website',
  },
}

export default function TermsPage() {
  return (
    <div
      className="min-h-screen text-text-primary font-mono text-sm px-6 py-16 mx-auto max-w-2xl leading-relaxed"
      style={{ background: 'rgb(var(--bg-base))' }}
    >
      <p className="text-text-muted text-xs mb-8">
        <Link href="/" className="hover:text-text-secondary transition-colors">
          ← Home
        </Link>
      </p>
      <h1 className="text-xl font-bold tracking-tight mb-6">Terms of Service</h1>
      <p className="text-text-secondary mb-4">
        This page is a placeholder. Replace with your binding terms, disclaimers (prediction markets
        involve risk), acceptable use, and subscription/refund rules before launch.
      </p>
      <p className="text-text-muted text-xs">
        © {new Date().getFullYear()} Prescio.
      </p>
    </div>
  )
}
