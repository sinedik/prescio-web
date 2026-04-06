'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import { api } from '../lib/api'

const FOOTER_LINKS = {
  PRODUCT: [
    { label: 'Markets', to: '/markets' },
    { label: 'Watchlist', to: '/watchlist' },
    { label: 'Portfolio', to: '/portfolio' },
    { label: 'Pricing', to: '/pricing' },
  ],
  COMPANY: [
    { label: 'About', to: '/' },
    { label: 'Privacy Policy', to: '/privacy' },
    { label: 'Terms of Service', to: '/terms' },
  ],
  INTELLIGENCE: [
    { label: 'Polymarket', href: 'https://polymarket.com' },
    { label: 'Kalshi', href: 'https://kalshi.com' },
    { label: 'Metaculus', href: 'https://metaculus.com' },
    { label: 'ISW Reports', href: 'https://understandingwar.org' },
  ],
}

function useNextScanMins() {
  const cycleMs = 120 * 60 * 1000
  const [mins, setMins] = useState(() => Math.ceil((cycleMs - (Date.now() % cycleMs)) / 60000))
  useEffect(() => {
    const id = setInterval(() => setMins(Math.ceil((cycleMs - (Date.now() % cycleMs)) / 60000)), 30000)
    return () => clearInterval(id)
  }, [cycleMs])
  return mins
}

export default function AppFooter() {
  const nextScan = useNextScanMins()
  const [analysesCount, setAnalysesCount] = useState<number | null>(null)

  useEffect(() => {
    api.getAccuracy()
      .then(data => { if (data.total > 0) setAnalysesCount(data.total) })
      .catch(() => {})
  }, [])

  return (
    <footer
      className="border-t"
      style={{
        background: 'rgb(var(--bg-surface))',
        borderColor: 'rgb(var(--bg-border))',
      }}
    >
      {/* Main grid */}
      <div
        className="mx-auto grid gap-10"
        style={{
          maxWidth: '1100px',
          padding: '48px clamp(16px, 4vw, 48px) 32px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
        }}
      >
        {/* Brand column */}
        <div className="flex flex-col gap-4">
          <Logo size={28} textSize={15} />
          <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgb(var(--text-muted))' }}>
            AI-powered intelligence for prediction<br />markets, sports, esports, and crypto.
          </p>
          {/* Platform badges */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {[
              { label: 'POLYMARKET', color: 'rgb(var(--poly))' },
              { label: 'KALSHI',     color: 'rgb(var(--kalshi))' },
              { label: 'METACULUS',  color: 'rgb(var(--metaculus))' },
            ].map(({ label, color }) => (
              <span
                key={label}
                className="text-[9px] font-mono font-bold px-2 py-0.5 rounded"
                style={{ color, background: `${color.replace(')', ' / 0.1)')}`, border: `1px solid ${color.replace(')', ' / 0.2)')}` }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {(Object.entries(FOOTER_LINKS) as [string, { label: string; to?: string; href?: string }[]][]).map(([section, links]) => (
          <div key={section} className="flex flex-col gap-3">
            <span
              className="text-[10px] font-mono font-bold tracking-widest"
              style={{ color: 'rgb(var(--text-secondary))' }}
            >
              {section}
            </span>
            {links.map(({ label, to, href }) =>
              href ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-mono transition-colors"
                  style={{ color: 'rgb(var(--text-muted))' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgb(var(--text-secondary))' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgb(var(--text-muted))' }}
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  href={to!}
                  className="text-xs font-mono transition-colors"
                  style={{ color: 'rgb(var(--text-muted))' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgb(var(--text-secondary))' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgb(var(--text-muted))' }}
                >
                  {label}
                </Link>
              )
            )}
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: 'rgb(var(--bg-border))' }}
      >
        <div
          className="mx-auto flex flex-wrap items-center justify-between gap-3"
          style={{ maxWidth: '1100px', padding: '14px clamp(16px, 4vw, 48px)' }}
        >
          <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
            © 2026 Prescio. All rights reserved.
          </span>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                {analysesCount ?? '—'} analyses today
              </span>
            </div>
            <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
              Next scan ~{nextScan} min
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
