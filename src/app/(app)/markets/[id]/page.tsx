import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import { supabase } from '@/lib/supabase'
import MarketDetailPage from '@/screens/MarketDetailPage'

export const revalidate = 300

interface Props { params: Promise<{ id: string }> }

async function fetchMarketMeta(id: string) {
  try {
    const { data } = await supabase
      .from('markets')
      .select('question, probability, platform')
      .eq('id', id)
      .single()
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const market = await fetchMarketMeta(id)
  const siteUrl = getSiteUrl()

  if (!market) {
    return { title: 'Market', description: 'Prediction market analysis on Prescio.' }
  }

  const prob = market.probability != null ? Math.round(Number(market.probability) * 100) : null
  const platform = market.platform ? String(market.platform) : null

  const descParts: string[] = []
  if (prob != null) descParts.push(`Current price: ${prob}%`)
  if (platform) descParts.push(`on ${platform.charAt(0).toUpperCase() + platform.slice(1)}`)
  descParts.push('AI edge analysis on Prescio.')

  const title = String(market.question ?? 'Market Analysis')
  const description = descParts.join(' · ')
  const canonical = `${siteUrl}/markets/${id}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} | Prescio`, description, url: canonical, type: 'article' },
    twitter: { card: 'summary', title: `${title} | Prescio`, description },
  }
}

export default MarketDetailPage
