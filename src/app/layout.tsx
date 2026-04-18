import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { getSiteUrl } from '@/lib/site'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

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
  // icon.tsx и apple-icon.tsx в src/app/ генерируют PNG-иконки автоматически.
  // SVG-fallback для поддерживающих браузеров.
  icons: {
    other: [{ rel: 'mask-icon', url: '/favicon.svg', color: '#00ff88' }],
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
  themeColor: '#0e0e0e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head suppressHydrationWarning>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('prescio-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
