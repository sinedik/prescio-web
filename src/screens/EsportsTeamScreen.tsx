'use client'
import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { usePolling } from '../hooks/usePolling'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'
import type { EsportsTeamPageData } from '../types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameToColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 52%)`
}

function initials(name: string): string {
  return name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase()
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = d.getTime() - now.getTime()
  const absDiff = Math.abs(diff)
  if (absDiff < 60 * 60_000) return diff > 0 ? `in ${Math.round(diff / 60000)}m` : `${Math.round(-diff / 60000)}m ago`
  if (absDiff < 24 * 3600_000) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function subcatToGame(sub: string): string {
  if (!sub) return 'cs2'
  if (sub.includes('dota')) return 'dota2'
  if (sub.includes('valorant')) return 'valorant'
  return 'cs2'
}

function priceBar(yesPrice: number) {
  const pct = Math.round(yesPrice * 100)
  return { pct, color: pct >= 60 ? '#4caf50' : pct <= 40 ? '#f44336' : '#888' }
}

// ─── Components ───────────────────────────────────────────────────────────────

function TeamLogo({ name, logoUrl, color, size = 56 }: { name: string; logoUrl?: string | null; color: string; size?: number }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="object-contain rounded"
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded flex items-center justify-center font-bold text-bg-base shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.33 }}
    >
      {initials(name)}
    </div>
  )
}

function humanStartIn(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  const diff = d - Date.now()
  if (diff <= 0) return 'starting now'
  const mins = Math.round(diff / 60_000)
  if (mins < 60) return `starts in ${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  if (hrs < 24) return rem ? `starts in ${hrs}h ${rem}m` : `starts in ${hrs}h`
  const days = Math.round(hrs / 24)
  return `starts in ${days}d`
}

function StatusDot({ status, startsAt }: { status: string; startsAt?: string }) {
  if (status === 'live') return (
    <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase"
      title="Match is live"
      style={{ color: '#ff5252' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
      LIVE
    </span>
  )
  if (status === 'finished') return (
    <span className="text-[9px] font-mono text-text-muted/50 uppercase" title="Match finished">finished</span>
  )
  return (
    <span className="text-[9px] font-mono text-text-muted/50 uppercase" title={humanStartIn(startsAt) || 'upcoming'}>upcoming</span>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

interface Props {
  teamId: string
  game: string
}

export default function EsportsTeamScreen({ teamId, game }: Props) {
  const router = useRouter()

  const fetcher = useCallback(
    () => api.getEsportsTeam(teamId),
    [teamId]
  )

  const { data, error, loading } = usePolling<EsportsTeamPageData>(fetcher, 5 * 60_000, `team:${teamId}`)

  // Derive team name from matches when GRID meta is unavailable (dev key limitation)
  const teamNameFromMatches = data?.matches?.flatMap(m => [m.teamA, m.teamB])
    .find(t => t?.id === teamId || String(t?.id) === teamId)?.name ?? null

  const teamName = data?.meta?.name ?? data?.meta?.nameShortened ?? teamNameFromMatches ?? `Team ${teamId}`
  const accent   = data?.meta?.colorPrimary ?? nameToColor(teamName)

  usePageTitle(data ? `${teamName} — Esports` : 'Loading…')

  if (loading && !data) {
    return (
      <div className="px-4 py-8 flex justify-center">
        <span className="text-[11px] font-mono text-text-muted animate-pulse">Loading team…</span>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-[12px] font-mono text-red-400">{String(error instanceof Error ? error.message : error)}</p>
      </div>
    )
  }

  const meta     = data?.meta
  const roster   = data?.roster ?? []
  const matches  = data?.matches ?? []
  const form     = data?.form ?? []
  const stats    = data?.stats
  const mapStats = data?.mapStats ?? {}
  const mapEntries = Object.entries(mapStats)
    .map(([map, s]) => ({ map, ...s, total: s.wins + s.losses, wr: s.wins / Math.max(1, s.wins + s.losses) }))
    .sort((a, b) => b.total - a.total)

  const upcoming = matches.filter(m => m.status !== 'finished').sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  const past     = matches.filter(m => m.status === 'finished').sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())

  return (
    <div className="px-3 sm:px-4 md:px-6 py-4 pb-12 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => window.history.length > 1 ? router.back() : router.push(`/cybersport/${game}`)}
          className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors shrink-0"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          back
        </button>
      </div>

      {/* Team hero */}
      <div
        className="rounded-xl p-5 mb-6 border"
        style={{ borderColor: `${accent}30`, background: `linear-gradient(135deg, ${accent}12 0%, transparent 60%)` }}
      >
        <div className="flex items-center gap-4">
          <TeamLogo name={teamName} logoUrl={meta?.logoUrl} color={accent} size={64} />
          <div>
            <h1 className="text-[20px] font-bold text-text-primary leading-tight">{teamName}</h1>
            {meta?.nameShortened && meta.nameShortened !== teamName && (
              <p className="text-[11px] font-mono text-text-muted mt-0.5">{meta.nameShortened}</p>
            )}
            <p className="text-[11px] font-mono text-text-muted/60 mt-1 uppercase tracking-wider">{game}</p>
          </div>
        </div>
      </div>

      {/* Stats / form / map stats */}
      {(stats || form.length > 0 || mapEntries.length > 0) && (
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {/* Winrate card */}
          {stats && (stats.wins + stats.losses) > 0 && (
            <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
              <p className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider mb-2">Winrate (30d)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-[28px] font-bold leading-none" style={{ color: accent }}>
                  {stats.winrate != null ? Math.round(stats.winrate * 100) : '—'}
                </span>
                <span className="text-[12px] font-mono text-text-muted">%</span>
              </div>
              <p className="text-[10px] font-mono text-text-muted/70 mt-1">
                {stats.wins}W · {stats.losses}L · {stats.wins + stats.losses} total
              </p>
              <div className="mt-2 flex h-1 rounded-full overflow-hidden bg-white/[0.05]">
                <div style={{ width: `${(stats.wins / Math.max(1, stats.wins + stats.losses)) * 100}%`, background: '#4caf50' }} />
                <div style={{ width: `${(stats.losses / Math.max(1, stats.wins + stats.losses)) * 100}%`, background: '#f4433688' }} />
              </div>
            </div>
          )}

          {/* Form chart */}
          {form.length > 0 && (
            <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
              <p className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider mb-2">Recent form</p>
              <div className="flex gap-1 flex-wrap">
                {form.slice(-10).map((f, i) => (
                  <div key={i} title={`${f.outcome} vs ${f.opponent?.name ?? '?'} — ${fmtDate(f.startsAt)}`}
                    className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: f.outcome === 'W' ? '#4caf5022' : '#f4433622',
                      color:      f.outcome === 'W' ? '#4caf50'   : '#f44336',
                      border:     `1px solid ${f.outcome === 'W' ? '#4caf5044' : '#f4433644'}`,
                    }}>
                    {f.outcome}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-mono text-text-muted/70 mt-2">
                Last {Math.min(10, form.length)} series
              </p>
            </div>
          )}

          {/* Map stats */}
          {mapEntries.length > 0 && (
            <div className="bg-bg-surface border border-bg-border rounded-lg p-4">
              <p className="text-[9px] font-mono text-text-muted/50 uppercase tracking-wider mb-2">Maps</p>
              <div className="flex flex-col gap-1.5">
                {mapEntries.slice(0, 5).map(m => (
                  <div key={m.map} className="flex items-center gap-2 text-[10px] font-mono">
                    <span className="flex-1 text-text-secondary truncate">{m.map}</span>
                    <span className="text-text-muted/70 tabular-nums w-12 text-right">{m.wins}-{m.losses}</span>
                    <span className="tabular-nums w-8 text-right font-bold"
                      style={{ color: m.wr >= 0.5 ? '#4caf50' : '#f44336' }}>
                      {Math.round(m.wr * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_280px] gap-4">

        {/* Matches column */}
        <div>
          {/* Upcoming / live */}
          {upcoming.length > 0 && (
            <section className="mb-5">
              <p className="text-[9px] font-bold tracking-[0.16em] text-text-muted/50 uppercase mb-2">Upcoming &amp; live</p>
              <div className="flex flex-col gap-2">
                {upcoming.map(m => {
                  const isThisTeamA = m.teamA?.id === teamId || String(m.teamA?.id) === teamId
                  const opponent = isThisTeamA ? m.teamB : m.teamA
                  const ourPrice  = isThisTeamA ? m.yesPrice : m.noPrice
                  const { pct, color } = priceBar(ourPrice)
                  const oppColor = nameToColor(opponent?.name ?? '')
                  const matchGame = subcatToGame(m.subcategory)

                  return (
                    <Link
                      key={m.id}
                      href={`/cybersport/${matchGame}/${m.id}`}
                      prefetch={false}
                      className="w-full text-left bg-bg-surface border border-bg-border rounded-lg px-4 py-3 hover:border-text-muted/30 transition-colors group block"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center font-bold text-bg-base shrink-0 text-[9px]"
                            style={{ background: oppColor }}
                          >
                            {initials(opponent?.name ?? '?')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-text-primary truncate">{opponent?.name ?? '?'}</p>
                            <p className="text-[10px] font-mono text-text-muted/70 truncate">{m.tournament}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0 gap-1">
                          <StatusDot status={m.status} startsAt={m.startsAt} />
                          <p className="text-[10px] font-mono text-text-muted">{fmtDate(m.startsAt)}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-[10px] font-mono shrink-0" style={{ color }}>{pct}%</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {/* Past matches */}
          {past.length > 0 && (
            <section>
              <p className="text-[9px] font-bold tracking-[0.16em] text-text-muted/50 uppercase mb-2">Recent results</p>
              <div className="flex flex-col gap-2">
                {past.map(m => {
                  const isThisTeamA = m.teamA?.id === teamId || String(m.teamA?.id) === teamId
                  const opponent = isThisTeamA ? m.teamB : m.teamA
                  const ourPrice  = isThisTeamA ? m.yesPrice : m.noPrice
                  const won = ourPrice >= 0.99
                  const lost = ourPrice <= 0.01
                  const resultColor = won ? '#4caf50' : lost ? '#f44336' : '#888'
                  const resultLabel = won ? 'W' : lost ? 'L' : '—'
                  const matchGame = subcatToGame(m.subcategory)

                  return (
                    <Link
                      key={m.id}
                      href={`/cybersport/${matchGame}/${m.id}`}
                      prefetch={false}
                      className="w-full text-left bg-bg-surface border border-bg-border rounded-lg px-4 py-3 hover:border-text-muted/30 transition-colors block"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-6 h-6 rounded flex items-center justify-center font-bold text-bg-base shrink-0 text-[9px]"
                            style={{ background: nameToColor(opponent?.name ?? '') }}
                          >
                            {initials(opponent?.name ?? '?')}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-text-primary truncate">vs {opponent?.name ?? '?'}</p>
                            <p className="text-[10px] font-mono text-text-muted/70 truncate">{m.tournament}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <p className="text-[10px] font-mono text-text-muted">{fmtDate(m.startsAt)}</p>
                          <span
                            className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold"
                            style={{ background: `${resultColor}22`, color: resultColor }}
                          >
                            {resultLabel}
                          </span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          {upcoming.length === 0 && past.length === 0 && (
            <p className="text-[12px] font-mono text-text-muted/50 text-center py-8">No matches found</p>
          )}
        </div>

        {/* Roster column */}
        {roster.length > 0 && (
          <aside>
            <p className="text-[9px] font-bold tracking-[0.16em] text-text-muted/50 uppercase mb-2">Roster</p>
            <div className="bg-bg-surface border border-bg-border rounded-lg overflow-hidden">
              {roster.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-bg-border' : ''}`}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-bg-base shrink-0"
                    style={{ background: accent }}
                  >
                    {(i + 1)}
                  </div>
                  <span className="text-[12px] font-medium text-text-primary">{p.nickname}</span>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>

    </div>
  )
}
