import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'

type Props = { children: React.ReactNode; params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  const { slug } = await params
  const base = getSiteUrl()
  const origin = (
    process.env.API_PROXY_TARGET ??
    process.env.SITEMAP_API_ORIGIN ??
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '')

  let title = 'Prediction market'
  let description =
    'Prediction market odds, volume, and AI-powered analysis on Prescio — Polymarket, Kalshi, Metaculus.'

  try {
    const res = await fetch(`${origin}/api/market/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const market = (await res.json()) as { question?: string; description?: string }
      if (market.question) {
        title = market.question.length > 64 ? `${market.question.slice(0, 61)}…` : market.question
        description =
          (market.description && market.description.slice(0, 155)) ||
          `Odds, liquidity, and AI edge for: ${market.question.slice(0, 120)}`
      }
    }
  } catch {
    /* оставляем дефолты */
  }

  const canonical = `${base}/market/${encodeURIComponent(slug)}`

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      siteName: 'Prescio',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default function MarketSlugLayout({ children }: { children: React.ReactNode }) {
  return children
}
