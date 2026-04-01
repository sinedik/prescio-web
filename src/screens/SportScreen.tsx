'use client'
import { useState } from 'react'
import { usePolling } from '../hooks/usePolling'
import { sportApi } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import { SportCard } from '../components/sport/SportCard'
import { TabBtn, SPORT_TABS, ESPORT_TABS } from '../components/sport/SportTabBar'
import DotaScreen from './DotaScreen'
import type { SportEvent, SubscriptionPlan } from '../types/index'

export function SportScreen() {
  const { profile } = useAuthContext()
  const plan = profile?.plan ?? (profile?.is_pro ? 'pro' : 'free') as SubscriptionPlan
  const [tab, setTab] = useState('')

  const isDota = tab === 'dota2'

  const { data, loading } = usePolling(
    () => isDota ? Promise.resolve(null) : sportApi.getEvents({ subcategory: tab || undefined, status: 'scheduled', limit: 30 }),
    120_000,
    tab,
  )

  const events: SportEvent[] = (data as { events?: SportEvent[] } | null)?.events ?? []

  return (
    <div className="flex flex-col">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 border-b border-bg-border bg-bg-base">
        <div className="max-w-5xl mx-auto px-6 py-3 flex flex-col gap-2">
          <h1 className="text-base font-semibold text-text-primary">Sport & Esports</h1>

          {/* Sport tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold text-text-muted tracking-widest uppercase shrink-0 w-12">SPORT</span>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
              <TabBtn value="" active={tab === ''} onClick={() => setTab('')}>All</TabBtn>
              {SPORT_TABS.map(t => (
                <TabBtn key={t.value} value={t.value} active={tab === t.value} onClick={() => setTab(t.value)} icon={t.icon}>
                  {t.label}
                </TabBtn>
              ))}
            </div>
          </div>

          {/* Esports tabs */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono font-bold text-text-muted tracking-widest uppercase shrink-0 w-12">ESPORTS</span>
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
              {ESPORT_TABS.map(t => (
                <TabBtn key={t.value} value={t.value} active={tab === t.value} onClick={() => setTab(t.value)} icon={t.icon}>
                  {t.label}
                </TabBtn>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {isDota ? (
        <DotaScreen />
      ) : (
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-3 px-6 py-5">
          {loading && events.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-full rounded-lg animate-pulse h-[100px] bg-bg-elevated" />
            ))
          }
          {!loading && events.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-sm text-text-muted">No events found</p>
              <p className="text-xs text-text-muted opacity-60 mt-1">
                {tab ? 'Data syncing — check back shortly' : 'Try a specific category'}
              </p>
            </div>
          )}
          {events.map(event => <SportCard key={event.id} event={event} plan={plan} />)}
        </div>
      )}
    </div>
  )
}
