import type { Metadata } from 'next'
import Link from 'next/link'
import { getSiteUrl } from '@/lib/site'

const site = getSiteUrl()

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Prescio collects, uses, and protects your data.',
  robots: { index: true, follow: true },
  alternates: { canonical: `${site}/privacy` },
  openGraph: {
    title: 'Privacy Policy | Prescio',
    description: 'How Prescio collects, uses, and protects your data.',
    url: `${site}/privacy`,
    type: 'website',
  },
}

export default function PrivacyPage() {
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
      <h1 className="text-xl font-bold tracking-tight mb-6">Privacy Policy</h1>
      <p className="text-text-secondary mb-4">
        This page is a placeholder. Replace with your final policy text and last-updated date before
        launch. Contact and data-processing details should match your actual product and jurisdictions.
      </p>
      <p className="text-text-muted text-xs">
        © {new Date().getFullYear()} Prescio. Questions: use the contact method you publish on the main
        site.
      </p>
    </div>
  )
}
