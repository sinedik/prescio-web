import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import { supabase } from '@/lib/supabase'
import SportEventPage from '@/screens/SportEventPage'

export const revalidate = 120 // sport events change fast

interface Props { params: Promise<{ id: string }> }

async function fetchSportMeta(id: string) {
  try {
    const { data } = await supabase
      .from('sport_events')
      .select('home_team, away_team, subcategory, starts_at')
      .eq('id', id)
      .single()
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const ev = await fetchSportMeta(id)
  const siteUrl = getSiteUrl()

  if (!ev) {
    return { title: 'Sport Event', description: 'Sports odds and AI analysis on Prescio.' }
  }

  const matchup = `${ev.home_team} vs ${ev.away_team}`
  const sport = ev.subcategory ?? 'sport'
  const title = matchup
  const description = `${matchup} — ${sport} odds, AI value analysis and edge signal on Prescio.`
  const canonical = `${siteUrl}/sport/${id}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title: `${title} | Prescio`, description, url: canonical, type: 'article' },
    twitter: { card: 'summary', title: `${title} | Prescio`, description },
  }
}

export default SportEventPage
