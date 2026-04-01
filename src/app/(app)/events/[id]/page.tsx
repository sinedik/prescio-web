import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import { supabase } from '@/lib/supabase'
import EventDetailPage from '@/screens/EventDetailPage'

export const revalidate = 300 // ISR: revalidate metadata every 5 min

interface Props { params: Promise<{ id: string }> }

async function fetchEventMeta(id: string) {
  try {
    const { data } = await supabase
      .from('unified_events')
      .select('title, description, category, event_analyses(edge_score, probability)')
      .eq('id', id)
      .single()
    return data
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const event = await fetchEventMeta(id)
  const siteUrl = getSiteUrl()

  if (!event) {
    return {
      title: 'Event',
      description: 'AI-powered prediction market analysis on Prescio.',
    }
  }

  const analysis = (event.event_analyses as { edge_score?: number; probability?: { yes?: number } }[] | null)?.[0]
  const prob = analysis?.probability?.yes != null ? Math.round(analysis.probability.yes * 100) : null
  const edge = analysis?.edge_score != null ? analysis.edge_score.toFixed(1) : null

  const descParts: string[] = []
  if (prob != null) descParts.push(`AI probability: ${prob}%`)
  if (edge != null) descParts.push(`Edge: ${Number(edge) > 0 ? '+' : ''}${edge}pp`)
  descParts.push('Full AI analysis on Prescio.')

  const description = descParts.join(' · ')
  const canonical = `${siteUrl}/events/${id}`
  const title = event.title ?? 'Event Analysis'

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | Prescio`,
      description,
      url: canonical,
      type: 'article',
    },
    twitter: {
      card: 'summary',
      title: `${title} | Prescio`,
      description,
    },
  }
}

export default EventDetailPage
