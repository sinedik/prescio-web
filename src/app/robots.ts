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
          '/dashboard',
          '/portfolio',
          '/profile',
          '/watchlist',
          '/feed',
          '/dota',
          '/sport',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
