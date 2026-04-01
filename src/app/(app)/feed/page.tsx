import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { FeedScreen } from '@/screens/FeedScreen'
import type { UnifiedEvent } from '@/types/index'

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Browse aggregated prediction markets from Kalshi, Polymarket and Metaculus. Filter by category, sort by edge signal or volume.',
}

export const revalidate = 60 // ISR: update feed every minute

async function getInitialEvents(): Promise<UnifiedEvent[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const { data } = await supabase
      .from('unified_events')
      .select('id, title, category, subcategory, source_name, source_type, source_id, status, ai_score, created_at, event_analyses(id, edge_score, probability, confidence)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20)
      .abortSignal(controller.signal)
    clearTimeout(timeout)
    return (data as unknown as UnifiedEvent[]) ?? []
  } catch {
    return []
  }
}

export default async function FeedPage() {
  const initialEvents = await getInitialEvents()
  return <FeedScreen initialEvents={initialEvents} />
}
