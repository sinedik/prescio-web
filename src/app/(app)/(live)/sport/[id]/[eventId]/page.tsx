import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { SportScreen } from '@/screens/SportScreen'
import type { Sport } from '@/screens/SportScreen'

const SPORT_KEYS: Sport[] = ['football', 'basketball', 'tennis', 'mma']

interface Props { params: Promise<{ id: string; eventId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params
  try {
    const { data } = await supabase
      .from('sport_events')
      .select('home_team, away_team')
      .eq('id', eventId)
      .single()
    if (data) {
      return { title: `${data.home_team} vs ${data.away_team}`, robots: { index: false } }
    }
  } catch { /* ignore */ }
  return { title: 'Sport Event', robots: { index: false } }
}

export default async function SportEventEmbeddedPage({ params }: Props) {
  const { id, eventId } = await params
  const sport: Sport = SPORT_KEYS.includes(id as Sport) ? (id as Sport) : 'football'
  return <SportScreen initialSport={sport} eventId={eventId} />
}
