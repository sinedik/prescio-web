import { slugifyQuestion } from '@/utils'

type MarketRow = { slug?: string; id?: string; question?: string }

export async function fetchMarketsForSitemap(): Promise<MarketRow[]> {
  const origin = (
    process.env.SITEMAP_API_ORIGIN ??
    process.env.API_PROXY_TARGET ??
    'http://127.0.0.1:8000'
  ).replace(/\/$/, '')
  try {
    const res = await fetch(`${origin}/api/markets?limit=500`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = (await res.json()) as MarketRow[] | { markets?: MarketRow[] }
    return Array.isArray(data) ? data : (data.markets ?? [])
  } catch {
    return []
  }
}

export function marketPathSegment(m: MarketRow): string | null {
  if (m.slug?.trim()) return m.slug.trim()
  if (m.question) return slugifyQuestion(m.question)
  return null
}
