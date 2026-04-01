import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { DashboardScreen } from '@/screens/DashboardScreen'
import type { UnifiedEvent } from '@/types/index'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your Prescio dashboard — top edge events, watchlist activity, and recent AI analyses.',
  robots: { index: false },
}

export const dynamic = 'force-dynamic' // auth-gated, never statically generated

async function getTopEdgeEvents(): Promise<UnifiedEvent[]> {
  try {
    const { data } = await supabase
      .from('unified_events')
      .select('id, title, category, source_name, source_type, source_id, status, ai_score, created_at, event_analyses(id, edge_score, probability, confidence)')
      .eq('status', 'active')
      .not('event_analyses', 'is', null)
      .order('ai_score', { ascending: false })
      .limit(5)
    return (data as unknown as UnifiedEvent[]) ?? []
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const topEdgeEvents = await getTopEdgeEvents()
  return <DashboardScreen initialTopEdge={topEdgeEvents} />
}
