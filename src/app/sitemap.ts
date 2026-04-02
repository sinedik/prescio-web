import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site'
import { fetchMarketsForSitemap, marketPathSegment } from '@/lib/sitemapMarkets'
import { supabase } from '@/lib/supabase'

export const revalidate = 3600

async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T | null> {
  const timeout = new Promise<null>((res) => setTimeout(() => res(null), ms))
  return Promise.race([promise, timeout])
}

async function fetchEventIds(): Promise<{ id: string; updated_at?: string }[]> {
  try {
    const query = supabase
      .from('unified_events')
      .select('id, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(500)
    const result = await withTimeout(Promise.resolve(query))
    return result?.data ?? []
  } catch {
    return []
  }
}

async function fetchSportEventIds(): Promise<{ id: string; updated_at?: string }[]> {
  try {
    const query = supabase
      .from('sport_events')
      .select('id, updated_at')
      .in('status', ['scheduled', 'live'])
      .order('updated_at', { ascending: false })
      .limit(200)
    const result = await withTimeout(Promise.resolve(query))
    return result?.data ?? []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl()
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base,                              lastModified: now, changeFrequency: 'weekly',  priority: 1 },
    { url: `${base}/markets`,                 lastModified: now, changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${base}/sport/football`,          lastModified: now, changeFrequency: 'hourly',  priority: 0.85 },
    { url: `${base}/sport/basketball`,        lastModified: now, changeFrequency: 'hourly',  priority: 0.85 },
    { url: `${base}/sport/tennis`,            lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${base}/sport/mma`,               lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${base}/cybersport/cs2`,          lastModified: now, changeFrequency: 'hourly',  priority: 0.85 },
    { url: `${base}/cybersport/dota2`,        lastModified: now, changeFrequency: 'hourly',  priority: 0.85 },
    { url: `${base}/pricing`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/privacy`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`,                   lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Unified events (prediction markets)
  const [eventRows, sportRows, marketRows] = await Promise.all([
    fetchEventIds(),
    fetchSportEventIds(),
    fetchMarketsForSitemap(),
  ])

  const eventEntries: MetadataRoute.Sitemap = eventRows.map((e) => ({
    url: `${base}/events/${e.id}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : now,
    changeFrequency: 'hourly',
    priority: 0.75,
  }))

  const sportEntries: MetadataRoute.Sitemap = sportRows.map((e) => ({
    url: `${base}/sport/${e.id}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : now,
    changeFrequency: 'hourly',
    priority: 0.7,
  }))

  const seen = new Set<string>()
  const marketEntries: MetadataRoute.Sitemap = []
  for (const m of marketRows) {
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

  return [...staticEntries, ...eventEntries, ...sportEntries, ...marketEntries]
}
