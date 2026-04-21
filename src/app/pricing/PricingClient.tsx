'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { usePaddle } from '@/hooks/usePaddle'
import { useAuthContext } from '@/contexts/AuthContext'
import { activateProAction } from '@/actions/paddle'
import { useLang } from '@/contexts/LanguageContext'
import { useT } from '@/lib/i18n'

const COMING_SOON_KEYS = new Set([
  'pricing.alpha.f4',
  'pricing.alpha.f5',
  'pricing.alpha.f2',
  'pricing.alpha.f3',
])

const CHECK_ICON = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="6.5" fill="currentColor" fillOpacity="0.12"/>
    <path d="M3.5 6.5l2 2L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export default function PricingClient() {
  const router = useRouter()
  const { lang } = useLang()
  const tr = useT(lang)
  const { user, profile, refreshProfile } = useAuthContext()
  const [loadingPlan, setLoadingPlan] = useState<'pro' | 'alpha' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { openCheckout } = usePaddle(async (transactionId) => {
    try { await activateProAction(transactionId) } catch { /* webhook may have already handled */ }
    await refreshProfile()
  })

  const PLANS = [
    {
      id: 'free' as const,
      name: 'Free',
      price: '$0',
      period: tr('pricing.forever'),
      tagline: tr('pricing.free.tagline'),
      features: ['pricing.free.f1', 'pricing.free.f2', 'pricing.free.f3', 'pricing.free.f4', 'pricing.free.f5'] as const,
      cta: tr('pricing.free.cta'),
      accent: false,
      featured: false,
    },
    {
      id: 'pro' as const,
      name: 'Pro',
      price: '$14.99',
      period: '/month',
      tagline: tr('pricing.pro.tagline'),
      features: ['pricing.pro.f1', 'pricing.pro.f2', 'pricing.pro.f3', 'pricing.pro.f4', 'pricing.pro.f5', 'pricing.pro.f6'] as const,
      cta: tr('pricing.pro.cta'),
      accent: true,
      featured: true,
    },
    {
      id: 'alpha' as const,
      name: 'Alpha',
      price: '$39.99',
      period: '/month',
      tagline: tr('pricing.alpha.tagline'),
      features: ['pricing.alpha.f1', 'pricing.alpha.f2', 'pricing.alpha.f3', 'pricing.alpha.f4', 'pricing.alpha.f5', 'pricing.alpha.f6'] as const,
      cta: tr('pricing.alpha.cta'),
      accent: false,
      featured: false,
    },
  ]

  const FAQ = [
    { q: tr('pricing.faq.q1'), a: tr('pricing.faq.a1') },
    { q: tr('pricing.faq.q2'), a: tr('pricing.faq.a2') },
    { q: tr('pricing.faq.q3'), a: tr('pricing.faq.a3') },
    { q: tr('pricing.faq.q4'), a: tr('pricing.faq.a4') },
    { q: tr('pricing.faq.q5'), a: tr('pricing.faq.a5') },
  ]

  async function handlePlanClick(planId: 'free' | 'pro' | 'alpha') {
    if (planId === 'free') {
      router.push(user ? '/markets' : '/auth?mode=signup')
      return
    }
    if (!user) {
      router.push('/auth?mode=signup')
      return
    }
    setError(null)
    setLoadingPlan(planId)
    try {
      await openCheckout(user.email ?? undefined, planId)
    } catch {
      setError(tr('pricing.error'))
    } finally {
      setLoadingPlan(null)
    }
  }

  const currentPlan = profile?.plan ?? 'free'

  return (
    <div className="min-h-screen font-mono" style={{ background: 'rgb(var(--bg-base))' }}>

      {/* Navbar */}
      <header
        className="h-14 flex items-center px-4 sm:px-8 border-b"
        style={{ borderColor: 'rgb(var(--bg-border))', background: 'rgb(var(--bg-base) / 0.95)' }}
      >
        <div className="flex items-center justify-between w-full max-w-5xl mx-auto">
          <Link href="/">
            <Logo size={22} textSize={13} />
          </Link>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/markets"
                className="text-xs font-mono px-3 py-1.5 rounded border transition-colors"
                style={{ color: 'rgb(var(--text-secondary))', borderColor: 'rgb(var(--bg-border))' }}
              >
                {tr('pricing.go_to_app')}
              </Link>
            ) : (
              <>
                <Link
                  href="/auth?mode=signin"
                  className="text-xs font-mono transition-colors"
                  style={{ color: 'rgb(var(--text-muted))' }}
                >
                  {tr('pricing.sign_in')}
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="text-xs font-mono px-3 py-1.5 rounded"
                  style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--bg-base))' }}
                >
                  {tr('pricing.start_free')}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-20">

        {/* Header */}
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6"
            style={{ background: 'rgb(var(--accent) / 0.08)', border: '1px solid rgb(var(--accent) / 0.2)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--accent))' }} />
            <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgb(var(--accent))' }}>
              {tr('pricing.badge')}
            </span>
          </div>
          <h1
            className="font-bold text-text-primary mb-4 whitespace-pre-line"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
          >
            {tr('pricing.headline').split('\n')[0]}<br />
            <span style={{ color: 'rgb(var(--accent))' }}>{tr('pricing.headline').split('\n')[1]}</span>
          </h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color: 'rgb(var(--text-secondary))', lineHeight: 1.7 }}>
            {tr('pricing.subtext')}
          </p>
        </div>

        {error && (
          <div
            className="text-xs text-center px-4 py-2 rounded-lg mb-8 mx-auto max-w-sm"
            style={{ color: 'rgb(var(--danger))', background: 'rgb(var(--danger) / 0.06)', border: '1px solid rgb(var(--danger) / 0.2)' }}
          >
            {error}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-24">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id
            const isLoading = loadingPlan === plan.id

            return (
              <div
                key={plan.id}
                style={{
                  background: 'rgb(var(--bg-surface))',
                  border: plan.featured
                    ? '1px solid rgb(var(--accent) / 0.4)'
                    : '1px solid rgb(var(--bg-border))',
                  borderRadius: '16px',
                  padding: '28px',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: plan.featured ? '0 0 40px 0 rgb(var(--accent) / 0.06)' : 'none',
                }}
              >
                {plan.featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider"
                    style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--bg-base))' }}
                  >
                    {tr('pricing.most_popular')}
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded"
                      style={{
                        color: plan.featured ? 'rgb(var(--accent))' : 'rgb(var(--text-secondary))',
                        background: plan.featured ? 'rgb(var(--accent) / 0.1)' : 'rgb(var(--bg-elevated))',
                      }}
                    >
                      {plan.name.toUpperCase()}
                    </span>
                    {isCurrentPlan && (
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded"
                        style={{ color: 'rgb(var(--text-muted))', background: 'rgb(var(--bg-elevated))' }}
                      >
                        {tr('pricing.current')}
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 mb-2">
                    <span
                      className="font-bold"
                      style={{ fontSize: '36px', color: 'rgb(var(--text-primary))', letterSpacing: '-0.03em', lineHeight: 1 }}
                    >
                      {plan.price}
                    </span>
                    <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                      {plan.period}
                    </span>
                  </div>

                  <p className="text-xs" style={{ color: 'rgb(var(--text-muted))', lineHeight: 1.5 }}>
                    {plan.tagline}
                  </p>
                </div>

                {/* CTA */}
                <button
                  onClick={() => handlePlanClick(plan.id)}
                  disabled={isLoading || isCurrentPlan}
                  className="w-full py-2.5 text-sm font-bold rounded-lg transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={
                    plan.featured
                      ? { background: 'rgb(var(--accent))', color: 'rgb(var(--bg-base))' }
                      : {
                          background: 'transparent',
                          color: 'rgb(var(--text-secondary))',
                          border: '1px solid rgb(var(--bg-border))',
                        }
                  }
                >
                  {isLoading ? tr('pricing.loading') : isCurrentPlan ? tr('pricing.current_plan') : plan.cta}
                </button>

                {/* Divider */}
                <div className="h-px mb-6" style={{ background: 'rgb(var(--bg-border))' }} />

                {/* Features */}
                <div className="flex flex-col gap-3 flex-1">
                  {plan.features.map((key) => (
                    <div key={key} className="flex items-start gap-2.5">
                      <span
                        className="shrink-0 mt-0.5"
                        style={{ color: plan.featured ? 'rgb(var(--accent))' : 'rgb(var(--text-secondary))' }}
                      >
                        {CHECK_ICON}
                      </span>
                      <span className="text-xs leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {tr(key)}
                        {COMING_SOON_KEYS.has(key) && (
                          <span
                            className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ color: 'rgb(var(--text-muted))', background: 'rgb(var(--bg-elevated))' }}
                          >
                            {tr('pricing.coming_soon')}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Cancel anytime note */}
                {plan.id !== 'free' && (
                  <p className="text-[10px] text-center mt-6" style={{ color: 'rgb(var(--text-muted))' }}>
                    {tr('pricing.cancel_billing')}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* Compare plans table */}
        <div className="mb-24">
          <h2
            className="font-bold text-center mb-10"
            style={{ fontSize: '20px', color: 'rgb(var(--text-primary))' }}
          >
            {tr('pricing.compare.title')}
          </h2>
          <div
            className="overflow-x-auto rounded-xl"
            style={{ border: '1px solid rgb(var(--bg-border))', background: 'rgb(var(--bg-surface))' }}
          >
            <table className="w-full text-xs font-mono" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgb(var(--bg-border))' }}>
                  <th
                    className="text-left font-bold tracking-wider"
                    style={{
                      fontSize: '10px',
                      padding: '14px 20px',
                      color: 'rgb(var(--text-muted))',
                      textTransform: 'uppercase',
                    }}
                  >
                    {tr('pricing.compare.feature')}
                  </th>
                  {(['Free', 'Pro', 'Alpha'] as const).map((name) => (
                    <th
                      key={name}
                      className="text-center font-bold tracking-wider"
                      style={{
                        fontSize: '10px',
                        padding: '14px 20px',
                        color: name === 'Pro' ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))',
                        textTransform: 'uppercase',
                        minWidth: '90px',
                      }}
                    >
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: tr('pricing.compare.row.markets'),  free: true,  pro: true,  alpha: true  },
                  { label: tr('pricing.compare.row.alerts'),   free: false, pro: true,  alpha: true  },
                  { label: tr('pricing.compare.row.ai'),       free: false, pro: true,  alpha: true  },
                  { label: tr('pricing.compare.row.ws'),       free: false, pro: true,  alpha: true  },
                  { label: tr('pricing.compare.row.edge25'),   free: false, pro: false, alpha: true  },
                  { label: tr('pricing.compare.row.export'),   free: false, pro: false, alpha: true  },
                  { label: tr('pricing.compare.row.priority'), free: false, pro: false, alpha: true  },
                ].map((row, i, arr) => (
                  <tr
                    key={row.label}
                    style={{
                      borderBottom: i === arr.length - 1 ? 'none' : '1px solid rgb(var(--bg-border) / 0.6)',
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 20px',
                        color: 'rgb(var(--text-secondary))',
                        fontFamily: 'Inter, ui-sans-serif, system-ui',
                        fontSize: '13px',
                      }}
                    >
                      {row.label}
                    </td>
                    {(['free', 'pro', 'alpha'] as const).map((plan) => (
                      <td
                        key={plan}
                        className="text-center"
                        style={{
                          padding: '14px 20px',
                          color: row[plan] ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))',
                          fontSize: '15px',
                        }}
                      >
                        {row[plan] ? '✓' : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2
            className="font-bold text-center mb-10"
            style={{ fontSize: '20px', color: 'rgb(var(--text-primary))' }}
          >
            {tr('pricing.faq_title')}
          </h2>
          <div className="flex flex-col gap-6">
            {FAQ.map(({ q, a }) => (
              <div key={q} style={{ borderBottom: '1px solid rgb(var(--bg-border))', paddingBottom: '24px' }}>
                <p className="text-sm font-bold mb-2" style={{ color: 'rgb(var(--text-primary))' }}>{q}</p>
                <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))', lineHeight: 1.7 }}>{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-20">
          <p className="text-sm mb-4" style={{ color: 'rgb(var(--text-muted))' }}>
            {tr('pricing.contact')}{' '}
            <a href="mailto:support@prescio.io" className="underline" style={{ color: 'rgb(var(--text-secondary))' }}>
              support@prescio.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
