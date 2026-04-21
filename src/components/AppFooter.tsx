'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import { api } from '../lib/api'
import { useAuthContext } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

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
  const { user } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)

  useEffect(() => {
    api.getAccuracy()
      .then(data => { if (data.total > 0) setAnalysesCount(data.total) })
      .catch(() => {})
  }, [])

  const footerLinks = useMemo(() => ({
    [tr('footer.product')]: [
      { label: tr('footer.markets'),   to: '/markets' },
      { label: tr('footer.sport'),     to: '/sport/football' },
      { label: tr('footer.esports'),   to: '/cybersport/cs2' },
      ...(user
        ? [{ label: tr('footer.watchlist'), to: '/watchlist' }]
        : []),
      { label: tr('footer.pricing'),   to: '/pricing' },
    ],
    [tr('footer.company')]: [
      { label: tr('footer.about'),         to: '/' },
      { label: tr('footer.how_it_works'),  to: '/how-it-works' },
      { label: tr('footer.privacy'),       to: '/privacy' },
      { label: tr('footer.terms'),         to: '/terms' },
    ],
    [tr('footer.intelligence')]: [
      { label: 'Polymarket', href: 'https://polymarket.com' },
      { label: 'Kalshi',     href: 'https://kalshi.com' },
      { label: 'Metaculus',  href: 'https://metaculus.com' },
      { label: 'ISW Reports', href: 'https://understandingwar.org' },
    ],
  }), [lang, user])

  return (
    <footer
      className="border-t"
      style={{ background: 'rgb(var(--bg-surface))', borderColor: 'rgb(var(--bg-border))' }}
    >
      <div
        className="mx-auto grid gap-10"
        style={{
          maxWidth: '1100px',
          padding: '48px clamp(16px, 4vw, 48px) 32px',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
        }}
      >
        <div className="flex flex-col gap-4">
          <Logo size={28} textSize={15} />
          <p className="font-mono text-xs leading-relaxed" style={{ color: 'rgb(var(--text-muted))' }}>
            {tr('footer.tagline')}
          </p>
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

        {(Object.entries(footerLinks) as [string, { label: string; to?: string; href?: string }[]][]).map(([section, links]) => (
          <div key={section} className="flex flex-col gap-3">
            <span className="text-[10px] font-mono font-bold tracking-widest" style={{ color: 'rgb(var(--text-secondary))' }}>
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

      <div className="border-t" style={{ borderColor: 'rgb(var(--bg-border))' }}>
        <div
          className="mx-auto flex flex-wrap items-center justify-between gap-3"
          style={{ maxWidth: '1100px', padding: '14px clamp(16px, 4vw, 48px)' }}
        >
          <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
            {tr('footer.copyright')}
          </span>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                {analysesCount ?? '—'} {tr('footer.analyses_today')}
              </span>
            </div>
            <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
              {tr('footer.next_scan')} ~{nextScan} {tr('footer.min')}
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
