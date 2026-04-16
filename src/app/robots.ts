import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/markets',
          '/market/',
          '/markets/',
          '/events/',
          '/sport',
          '/sport/',
          '/cybersport',
          '/cybersport/',
          '/pricing',
          '/privacy',
          '/terms',
        ],
        disallow: [
          '/api/',
          '/auth',
          '/forgot-password',
          '/onboarding',
          '/pro-success',
          '/portfolio',
          '/profile',
          '/watchlist',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
