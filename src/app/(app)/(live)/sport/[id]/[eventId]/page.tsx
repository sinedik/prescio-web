import type { Metadata } from 'next'
import { SportScreen } from '@/screens/SportScreen'
import type { Sport } from '@/screens/SportScreen'
import { fetchSportEventFullSSR } from '@/lib/serverData'

const SPORT_KEYS: Sport[] = ['football', 'basketball', 'tennis', 'mma']

interface Props { params: Promise<{ id: string; eventId: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { eventId } = await params
  const full = await fetchSportEventFullSSR(eventId)
  if (full?.event) {
    return { title: `${full.event.home_team} vs ${full.event.away_team}`, robots: { index: false } }
  }
  return { title: 'Sport Event', robots: { index: false } }
}

export default async function SportEventEmbeddedPage({ params }: Props) {
  const { id, eventId } = await params
  const sport: Sport = SPORT_KEYS.includes(id as Sport) ? (id as Sport) : 'football'
  const full = await fetchSportEventFullSSR(eventId)
  return <SportScreen initialSport={sport} eventId={eventId} initialEventFull={full ?? undefined} />
}
