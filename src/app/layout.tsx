import type { Metadata, Viewport } from 'next'
import { getSiteUrl } from '@/lib/site'
import { Providers } from './providers'
import './globals.css'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Prescio — See the Edge Before the Market Does',
    template: '%s | Prescio',
  },
  description:
    'AI-powered analysis of Polymarket, Kalshi and Metaculus. Find mispriced markets before the crowd corrects them.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Prescio',
    url: `${siteUrl}/`,
    title: 'Prescio — Prediction Market Intelligence',
    description: 'AI-powered edge detection. Find mispriced markets before the crowd.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Prescio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prescio — Prediction Market Intelligence',
    description: 'AI-powered prediction market intelligence.',
    images: [`${siteUrl}/og-image.png`],
  },
  icons: { icon: '/favicon.svg' },
  manifest: '/site.webmanifest',
  alternates: { canonical: `${siteUrl}/` },
}

export const viewport: Viewport = {
  themeColor: '#080808',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
