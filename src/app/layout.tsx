import type { Metadata, Viewport } from 'next'
import { getSiteUrl } from '@/lib/site'
import { Providers } from './providers'
import './globals.css'

const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Prescio — AI Analytics for Markets, Sports & Esports',
    template: '%s | Prescio',
  },
  description:
    'Prescio aggregates Polymarket, Kalshi, Metaculus, sports and esports in one feed. AI analyzes probabilities and finds where the market misprices events — before the crowd corrects it.',
  keywords: [
    'prediction markets', 'kalshi', 'polymarket', 'metaculus',
    'prediction market analysis', 'AI betting', 'sports analytics',
    'esports analytics', 'market edge', 'betting tools',
    'football analytics', 'basketball analytics', 'dota 2 analytics', 'cs2 analytics',
    'sports betting AI', 'odds analysis', 'mispriced markets',
    'prediction market edge', 'esports betting', 'AI sports prediction',
  ],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ru_RU'],
    siteName: 'Prescio',
    url: `${siteUrl}/`,
    title: 'Prescio — AI Analytics for Markets, Sports & Esports',
    description: 'One feed. Polymarket, Kalshi, Metaculus, sports & esports. AI finds where the market misprices events — before the crowd corrects it.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prescio — AI Analytics for Markets, Sports & Esports',
    description: 'One feed. Polymarket, Kalshi, Metaculus, sports & esports. AI finds where the market misprices events — before the crowd corrects it.',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/site.webmanifest',
  alternates: {
    canonical: `${siteUrl}/`,
    languages: {
      'en': `${siteUrl}/`,
      'ru': `${siteUrl}/`,
      'x-default': `${siteUrl}/`,
    },
  },
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Oswald:wght@600;700&family=Rajdhani:wght@600;700&family=Cinzel:wght@600;700;900&family=Bebas+Neue&family=Barlow+Condensed:wght@700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
