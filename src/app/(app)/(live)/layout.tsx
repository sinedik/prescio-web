'use client'
import React, { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LiveLayoutProvider, useLiveLayout, type SidebarLeague } from '@/contexts/LiveLayoutContext'
import { useLang } from '@/contexts/LanguageContext'
import { useT } from '@/lib/i18n'
import { WorldBackground } from '@/components/WorldBackground'
import { ACCENT, type Discipline } from '@/components/disciplines'
import { LiveHero } from '@/components/LiveHero'
import { LogoFootball, LogoBasketball, LogoTennis, LogoMMA, LogoCS2, LogoDota2 } from '@/components/icons/games'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDiscipline(pathname: string): Discipline {
  if (pathname.startsWith('/sport/football'))    return 'football'
  if (pathname.startsWith('/sport/basketball'))  return 'basketball'
  if (pathname.startsWith('/sport/tennis'))      return 'tennis'
  if (pathname.startsWith('/sport/mma'))         return 'mma'
  if (pathname.startsWith('/cybersport/dota2'))    return 'dota2'
  if (pathname.startsWith('/cybersport/valorant')) return 'valorant'
  if (pathname.startsWith('/cybersport'))          return 'cs2'
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
  { href: '/cybersport/cs2',   label: 'CS2',     icon: <LogoCS2 size={16} />,   d: 'cs2'   as Discipline, disabled: false },
  { href: '/cybersport/dota2', label: 'Dota 2',  icon: <LogoDota2 size={16} />, d: 'dota2' as Discipline, disabled: false },
]

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function LiveSidebar({
  discipline, pathname, isPending, navigate, mobileOpen, onMobileClose,
}: {
  discipline: Discipline
  pathname: string
  isPending: boolean
  navigate: (href: string) => void
  mobileOpen: boolean
  onMobileClose: () => void
}) {
  const { leagues, selectedLeague, setSelectedLeague, liveCount } = useLiveLayout()
  const { lang } = useLang()
  const t = useT(lang)
  const accent = ACCENT[discipline]
  const isSport = pathname.startsWith('/sport')
  const items = isSport ? SPORT_ITEMS : GAME_ITEMS

  // Base listing path for current discipline (e.g. /sport/football)
  const basePath = isSport
    ? (SPORT_ITEMS.find(i => pathname.startsWith(i.href))?.href ?? '/sport/football')
    : (GAME_ITEMS.find(i => pathname.startsWith(i.href))?.href ?? '/cybersport/cs2')

  const sportSlug = SPORT_ITEMS.find(i => pathname.startsWith(i.href))?.href.split('/').pop() ?? 'football'

  function handleLeagueFilter(league: SidebarLeague) {
    setSelectedLeague(league.name)
    if (pathname !== basePath) navigate(basePath)
  }

  function handleLeagueNavigate(league: SidebarLeague) {
    if (league.leagueId) navigate(`/sport/${sportSlug}/league/${league.leagueId}`)
  }

  return (
    <aside
      className={`fixed md:static top-[52px] left-0 bottom-[56px] md:bottom-0 w-[200px] shrink-0 border-r border-bg-border bg-bg-surface flex flex-col z-[100] ${mobileOpen ? 'translate-x-0' : '-translate-x-[200px] md:translate-x-0'}`}
      style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 0.2s ease, transform 0.2s ease', overflowY: 'hidden' }}
    >
      {/* Mobile close */}
      <button
        className="md:hidden absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
        onClick={onMobileClose}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
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
                  ? 'border-l-transparent text-text-muted/45 cursor-not-allowed'
                  : isActive
                    ? 'text-text-primary bg-text-primary/[0.04]'
                    : 'border-l-transparent text-text-muted hover:text-text-secondary hover:bg-text-primary/[0.02]'
                }`}
              style={isActive && !item.disabled ? { borderLeftColor: itemAccent } : {}}
            >
              <span className={isActive && !item.disabled ? 'opacity-100' : 'opacity-60'}>{item.icon}</span>
              {item.label}
              {item.disabled && (
                <span className="ml-auto text-[8px] font-mono text-text-muted/45">soon</span>
              )}
              {isActive && !item.disabled && liveCount > 0 && (
                <span className="ml-auto flex items-center gap-0.5 text-[8px] font-bold px-1 py-0.5 rounded"
                  style={{ background: 'rgba(255,50,50,0.14)', color: '#ff5252' }}>
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse inline-block" />
                  {liveCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Leagues / Tournaments */}
      {leagues.length > 0 && (
        <div className="flex flex-col min-h-0 flex-1 overflow-y-auto pb-2">
          <p className="text-[9px] font-bold tracking-[0.16em] text-text-muted/50 uppercase px-3.5 mb-1.5 pt-0 shrink-0">
            {isSport ? t('sidebar.leagues') : t('sidebar.tournaments')}
          </p>
          <button
            onClick={() => { setSelectedLeague(null); if (pathname !== basePath) navigate(basePath) }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-[7px] text-[12px] border-l-2 transition-all
              ${selectedLeague === null
                ? 'text-text-primary bg-text-primary/[0.04]'
                : 'border-l-transparent text-text-muted hover:text-text-secondary hover:bg-text-primary/[0.02]'
              }`}
            style={selectedLeague === null ? { borderLeftColor: accent } : {}}
          >{t('common.all')}</button>
          {leagues.map(l => {
            const isActive = selectedLeague === l.name
            return (
              <div key={l.name}
                className={`flex items-center border-l-2 transition-all text-[12px] group
                  ${isActive ? 'text-text-primary bg-text-primary/[0.04]' : 'border-l-transparent text-text-muted hover:bg-text-primary/[0.02]'}`}
                style={isActive ? { borderLeftColor: accent } : {}}
              >
                <button
                  onClick={() => handleLeagueFilter(l)}
                  className={`flex-1 flex items-center gap-2 px-3.5 py-[7px] text-left min-w-0
                    ${isActive ? '' : 'hover:text-text-secondary'}`}
                >
                  {l.flag
                    ? <img src={l.flag} alt="" className="w-4 h-3 object-cover rounded-[2px] shrink-0 opacity-70" /> // eslint-disable-line @next/next/no-img-element
                    : <div className="w-4 h-3 shrink-0" />
                  }
                  <span className="truncate">{l.name}</span>
                </button>
                {l.leagueId && (
                  <button
                    onClick={() => handleLeagueNavigate(l)}
                    className="shrink-0 pr-2.5 pl-1 py-2 opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity text-text-muted"
                    title={lang === 'ru' ? `Страница ${l.name}` : `${l.name} page`}
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M7 17L17 7M17 7H7M17 7v10"/>
                    </svg>
                  </button>
                )}
              </div>
            )
          })}
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
  const [mobileOpen, setMobileOpen]  = useState(false)
  const { setSelectedLeague, setLeagues, setTotalCount, setLiveCount, hideHero, setHideHero } = useLiveLayout()

  const navigate = (href: string) => {
    setMobileOpen(false)
    startTransition(() => router.push(href))
  }

  // Close sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

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
      {/* Background — starts after sidebar on desktop, full width on mobile */}
      <div className="live-world-bg fixed top-[52px] left-0 md:left-[200px] right-0 bottom-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0, opacity: isPending ? 0.35 : 1, transition: 'opacity 0.4s ease' }}>
        <WorldBackground discipline={discipline} />
      </div>

      {/* Mobile backdrop — sidebar leagues drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[99] bg-black/60 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile leagues button — bottom-left above tab bar */}
      <button
        className="md:hidden fixed bottom-[64px] left-3 z-[90] h-8 px-3 flex items-center gap-1.5 rounded-lg border border-bg-border bg-bg-surface/90 text-text-muted hover:text-text-primary transition-colors text-[10px] font-mono font-bold tracking-wider"
        style={{ backdropFilter: 'blur(6px)' }}
        onClick={() => setMobileOpen(true)}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        LEAGUES
      </button>

      <div className="live-shell flex relative" style={{ zIndex: 1 }}>

        <LiveSidebar
          discipline={discipline}
          pathname={pathname}
          isPending={isPending}
          navigate={navigate}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <div
          id="live-content"
          className="live-content flex-1 min-w-0"
          style={{ opacity: isPending ? 0.45 : 1, transition: 'opacity 0.25s ease', position: 'relative', overflowY: 'auto' }}
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

          <div className="max-w-[1280px] mx-auto w-full">
            {!hideHero && !pathname.includes('/team/') && (
              <div style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                <div className="px-3 sm:px-4 md:px-6">
                  <LiveHero discipline={discipline} />
                </div>
              </div>
            )}
            {children}
          </div>
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
