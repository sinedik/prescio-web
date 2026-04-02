'use client'
import React, { useEffect, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LiveLayoutProvider, useLiveLayout } from '@/contexts/LiveLayoutContext'
import { WorldBackground, ACCENT, type Discipline } from '@/components/WorldBackground'
import { LiveHero } from '@/components/LiveHero'
import { LogoFootball, LogoBasketball, LogoTennis, LogoMMA, LogoCS2, LogoDota2, LogoValorant } from '@/components/icons/games'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDiscipline(pathname: string): Discipline {
  if (pathname.startsWith('/sport/football'))    return 'football'
  if (pathname.startsWith('/sport/basketball'))  return 'basketball'
  if (pathname.startsWith('/sport/tennis'))      return 'tennis'
  if (pathname.startsWith('/sport/mma'))         return 'mma'
  if (pathname.startsWith('/cybersport/dota2'))  return 'dota2'
  if (pathname.startsWith('/cybersport'))        return 'cs2'
  return 'football'
}

// ─── Nav items ────────────────────────────────────────────────────────────────
const SPORT_ITEMS = [
  { href: '/sport/football',   label: 'Football',   icon: <LogoFootball size={16} />,   d: 'football'   as Discipline, disabled: false },
  { href: '/sport/basketball', label: 'Basketball', icon: <LogoBasketball size={16} />, d: 'basketball' as Discipline, disabled: false },
  { href: '/sport/tennis',     label: 'Tennis',     icon: <LogoTennis size={16} />,     d: 'tennis'     as Discipline, disabled: false },
  { href: '/sport/mma',        label: 'MMA',        icon: <LogoMMA size={16} />,        d: 'mma'        as Discipline, disabled: false },
]

const GAME_ITEMS = [
  { href: '/cybersport/cs2',      label: 'CS2',      icon: <LogoCS2 size={16} />,      d: 'cs2'      as Discipline, disabled: false },
  { href: '/cybersport/dota2',    label: 'Dota 2',   icon: <LogoDota2 size={16} />,    d: 'dota2'    as Discipline, disabled: false },
  { href: '/cybersport/valorant', label: 'Valorant', icon: <LogoValorant size={16} />, d: 'valorant' as Discipline, disabled: true  },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function LiveSidebar({
  discipline, pathname, isPending, navigate,
}: {
  discipline: Discipline
  pathname: string
  isPending: boolean
  navigate: (href: string) => void
}) {
  const { leagues, selectedLeague, setSelectedLeague } = useLiveLayout()
  const accent = ACCENT[discipline]
  const isSport = pathname.startsWith('/sport')
  const items = isSport ? SPORT_ITEMS : GAME_ITEMS

  return (
    <aside
      className="w-[200px] shrink-0 border-r border-bg-border bg-bg-surface flex flex-col"
      style={{ height: '100%', opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s ease', overflowY: 'hidden' }}
    >
      {/* Section */}
      <div className="mb-5 shrink-0">
        <p className="text-[9px] font-bold tracking-[0.16em] text-text-muted/50 uppercase px-3.5 mb-1.5 pt-4">
          {isSport ? 'Sports' : 'Games'}
        </p>
        {items.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const itemAccent = ACCENT[item.d]
          return (
            <button
              key={item.href}
              onClick={() => !item.disabled && navigate(item.href)}
              disabled={item.disabled || isPending}
              className={`w-full flex items-center gap-2.5 px-3.5 py-[7px] text-left transition-all border-l-2 text-[12px]
                ${item.disabled
                  ? 'border-l-transparent text-text-muted/30 cursor-not-allowed'
                  : isActive
                    ? 'text-text-primary bg-white/[0.04]'
                    : 'border-l-transparent text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
                }`}
              style={isActive && !item.disabled ? { borderLeftColor: itemAccent } : {}}
            >
              <span className={isActive && !item.disabled ? 'opacity-100' : 'opacity-60'}>{item.icon}</span>
              {item.label}
              {item.disabled && (
                <span className="ml-auto text-[8px] font-mono text-text-muted/30">soon</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Leagues / Tournaments */}
      {leagues.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1 overflow-y-auto pb-2">
          <p className="text-[9px] font-bold tracking-[0.16em] text-text-muted/50 uppercase px-3.5 mb-1.5 pt-0 shrink-0">
            {isSport ? 'Лиги' : 'Турниры'}
          </p>
          <button
            onClick={() => setSelectedLeague(null)}
            className={`w-full flex items-center gap-2.5 px-3.5 py-[7px] text-[12px] border-l-2 transition-all
              ${selectedLeague === null
                ? 'text-text-primary bg-white/[0.04]'
                : 'border-l-transparent text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
              }`}
            style={selectedLeague === null ? { borderLeftColor: accent } : {}}
          >Все</button>
          {leagues.map(l => (
            <button
              key={l}
              onClick={() => setSelectedLeague(l)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-[7px] text-[12px] border-l-2 transition-all text-left
                ${selectedLeague === l
                  ? 'text-text-primary bg-white/[0.04]'
                  : 'border-l-transparent text-text-muted hover:text-text-secondary hover:bg-white/[0.02]'
                }`}
              style={selectedLeague === l ? { borderLeftColor: accent } : {}}
            >
              <span className="truncate">{l}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}

// ─── Inner shell (needs context) ──────────────────────────────────────────────
function LiveLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname()
  const router     = useRouter()
  const discipline = getDiscipline(pathname)
  const [isPending, startTransition] = useTransition()
  const { setSelectedLeague, setLeagues, setTotalCount, setLiveCount, hideHero, setHideHero } = useLiveLayout()

  const navigate = (href: string) => startTransition(() => router.push(href))

  // Reset filters when discipline changes
  useEffect(() => {
    setSelectedLeague(null)
    setLeagues([])
    setTotalCount(0)
    setLiveCount(0)
    setHideHero(false)
  }, [discipline]) // eslint-disable-line react-hooks/exhaustive-deps

  const accent = ACCENT[discipline]

  return (
    <>
      {/* Background fixed behind content area — starts after sidebar */}
      <div style={{ position: 'fixed', top: 52, left: 200, right: 0, bottom: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', opacity: isPending ? 0.35 : 1, transition: 'opacity 0.4s ease' }}>
        <WorldBackground discipline={discipline} />
      </div>

      <div className="flex relative" style={{ zIndex: 1, height: 'calc(100vh - 52px)', overflow: 'hidden' }}>

        <LiveSidebar
          discipline={discipline}
          pathname={pathname}
          isPending={isPending}
          navigate={navigate}
        />

        <div
          id="live-content"
          className="flex-1 min-w-0"
          style={{ opacity: isPending ? 0.45 : 1, transition: 'opacity 0.25s ease', position: 'relative', overflowY: 'auto', backdropFilter: 'blur(6px)', WebkitBackdropзаFilter: 'blur(6px)', background: 'rgba(8,8,8,0.35)' }}
        >
          {/* Progress bar */}
          {isPending && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, overflow: 'hidden', zIndex: 50 }}>
              <div style={{
                height: '100%',
                width: '45%',
                background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
                animation: 'nav-progress 1.1s ease infinite',
              }} />
            </div>
          )}

          {!hideHero && (
            <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
              <div className="px-6">
                <LiveHero discipline={discipline} />
              </div>
            </div>
          )}
          {children}
        </div>

      </div>
    </>
  )
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function LiveLayout({ children }: { children: React.ReactNode }) {
  return (
    <LiveLayoutProvider>
      <LiveLayoutInner>{children}</LiveLayoutInner>
    </LiveLayoutProvider>
  )
}
