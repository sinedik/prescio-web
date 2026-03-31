import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'
import { fetchMarketsForSitemap, marketPathSegment } from '@/lib/sitemapMarkets'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    {
      url: `${base}/markets`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  const rows = await fetchMarketsForSitemap()
  const seen = new Set<string>()
  const marketEntries: MetadataRoute.Sitemap = []

  for (const m of rows) {
    const seg = marketPathSegment(m)
    if (!seg || seen.has(seg)) continue
    seen.add(seg)
    marketEntries.push({
      url: `${base}/market/${encodeURIComponent(seg)}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.65,
    })
  }

  return [...staticEntries, ...marketEntries]
}
