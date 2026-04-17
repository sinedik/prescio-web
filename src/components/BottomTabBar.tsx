'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuthContext } from '@/contexts/AuthContext'

function IconMarkets() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function IconSport() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  )
}

function IconCybersport() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M12 12h.01" />
      <path d="M7 12h2" />
      <path d="M8 11v2" />
      <circle cx="16.5" cy="11.5" r=".5" fill="currentColor" />
      <circle cx="18.5" cy="12.5" r=".5" fill="currentColor" />
    </svg>
  )
}

function IconProfile() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function IconSignIn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  )
}

const TABS = [
  { key: 'markets',    href: '/markets',    label: 'Markets',    icon: IconMarkets },
  { key: 'sport',      href: '/sport',      label: 'Sport',      icon: IconSport },
  { key: 'cybersport', href: '/cybersport', label: 'Cyber',      icon: IconCybersport },
] as const

function TabItem({ href, label, icon: Icon, active }: {
  href: string
  label: string
  icon: () => React.ReactElement
  active: boolean
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
      style={{ color: active ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))' }}
    >
      {active && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
          style={{ background: 'rgb(var(--accent))' }}
        />
      )}
      <span
        className="transition-transform duration-200"
        style={{ transform: active ? 'scale(1.15)' : 'scale(1)' }}
      >
        <Icon />
      </span>
      <span
        className="text-[9px] font-mono font-bold tracking-wider transition-opacity duration-200"
        style={{ opacity: active ? 1 : 0.6 }}
      >
        {label.toUpperCase()}
      </span>
    </Link>
  )
}

export function BottomTabBar() {
  const pathname = usePathname()
  const { user } = useAuthContext()

  const [lastSport, setLastSport] = useState('/sport/football')
  const [lastCyber, setLastCyber] = useState('/cybersport/cs2')

  useEffect(() => {
    setLastSport(localStorage.getItem('lastSportPath') ?? '/sport/football')
    setLastCyber(localStorage.getItem('lastCybersportPath') ?? '/cybersport/cs2')
  }, [])

  function resolveHref(key: string) {
    if (key === 'sport')      return lastSport
    if (key === 'cybersport') return lastCyber
    return '/markets'
  }

  function isActive(key: string) {
    const p = pathname ?? ''
    if (key === 'markets')    return p === '/markets' || p.startsWith('/market')
    if (key === 'sport')      return p.startsWith('/sport')
    if (key === 'cybersport') return p.startsWith('/cybersport')
    return false
  }

  const profileActive = pathname?.startsWith('/profile') || pathname?.startsWith('/portfolio') || pathname?.startsWith('/watchlist')

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-[200] flex items-stretch border-t"
      style={{
        background: 'rgb(var(--bg-surface))',
        borderColor: 'rgb(var(--bg-border))',
        height: 'calc(56px + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(({ key, label, icon }) => (
        <TabItem
          key={key}
          href={resolveHref(key)}
          label={label}
          icon={icon}
          active={isActive(key)}
        />
      ))}

      {user ? (
        <TabItem href="/profile" label="Profile" icon={IconProfile} active={!!profileActive} />
      ) : (
        <TabItem href="/auth" label="Sign in" icon={IconSignIn} active={false} />
      )}
    </nav>
  )
}
