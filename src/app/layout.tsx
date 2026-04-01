import type { Metadata, Viewport } from 'next'
import { getSiteUrl } from '@/lib/site'
import { Providers } from './providers'
import './globals.css'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Prescio — AI Edge Detection for Prediction Markets',
    template: '%s | Prescio',
  },
  description:
    'AI edge detection across prediction markets, sports, esports & crypto. Kalshi, Polymarket, Metaculus, football odds, Dota 2, CS2 — one platform. Free to track, Pro to act.',
  keywords: [
    'prediction markets', 'kalshi', 'polymarket', 'metaculus',
    'prediction market analysis', 'AI betting', 'esports analytics',
    'market edge', 'betting tools', 'dota 2 analytics', 'cs2 analytics',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Prescio',
    url: `${siteUrl}/`,
    title: 'Prescio — AI Edge Detection for Prediction Markets',
    description: 'One platform. Kalshi, Polymarket, Metaculus, sports odds and esports. AI finds where the market is wrong — you act on it.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prescio — AI Edge Detection for Prediction Markets',
    description: 'One platform. Kalshi, Polymarket, Metaculus, sports odds and esports. AI finds where the market is wrong — you act on it.',
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
