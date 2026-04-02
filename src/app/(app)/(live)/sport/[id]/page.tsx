import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import { supabase } from '@/lib/supabase'
import { SportScreen } from '@/screens/SportScreen'
import type { Sport } from '@/screens/SportScreen'
import SportEventPage from '@/screens/SportEventPage'

const SPORT_KEYS: Sport[] = ['football', 'basketball', 'tennis', 'mma']

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

  const siteUrl = getSiteUrl()

  if (SPORT_KEYS.includes(id as Sport)) {
    const label = id.charAt(0).toUpperCase() + id.slice(1)
    const title = `${label} — AI Odds Analysis & Live Matches`
    const description = `Live ${label.toLowerCase()} matches with AI-powered odds analysis and edge signals. Find value bets before the market corrects — Prescio.`
    const canonical = `${siteUrl}/sport/${id}`
    return {
      title,
      description,
      alternates: {
        canonical,
        languages: { en: canonical, ru: canonical, 'x-default': canonical },
      },
      openGraph: { title: `${title} | Prescio`, description, url: canonical, type: 'website' },
      twitter: { card: 'summary_large_image', title: `${title} | Prescio`, description },
    }
  }

  const ev = await fetchSportMeta(id)

  if (!ev) {
    return { title: 'Sport Event', description: 'Sports odds and AI analysis on Prescio.' }
  }

  const matchup = `${ev.home_team} vs ${ev.away_team}`
  const sport = ev.subcategory ?? 'sport'
  const description = `${matchup} — ${sport} odds, AI value analysis and edge signal on Prescio.`
  const canonical = `${siteUrl}/sport/${id}`

  return {
    title: matchup,
    description,
    alternates: {
      canonical,
      languages: { en: canonical, ru: canonical, 'x-default': canonical },
    },
    openGraph: { title: `${matchup} | Prescio`, description, url: canonical, type: 'article' },
    twitter: { card: 'summary', title: `${matchup} | Prescio`, description },
  }
}

export default async function SportDisciplinePage({ params }: Props) {
  const { id } = await params

  if (SPORT_KEYS.includes(id as Sport)) {
    return <SportScreen initialSport={id as Sport} />
  }

  // Legacy: standalone event page (backward compat)
  return <SportEventPage id={id} />
}
