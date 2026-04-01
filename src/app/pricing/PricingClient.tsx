'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { usePaddle } from '@/hooks/usePaddle'
import { useAuthContext } from '@/contexts/AuthContext'
import { api } from '@/lib/api'

// ── Plan definitions ──────────────────────────────────────────────────────────

const FREE_FEATURES = [
  'Prediction markets feed (Polymarket, Kalshi, Metaculus)',
  'Sports odds tracking — 15+ football leagues',
  'Esports live match tracking (Dota 2)',
  'Crypto market signals feed',
  'Watchlist & portfolio tracking',
]

const PRO_FEATURES = [
  'Everything in Free',
  'Unlimited AI analysis on any market',
  'Full thesis & crowd bias breakdown',
  'Resolution arbitrage analysis',
  'Event context & timeline',
  'Sports & crypto AI signals',
]

const ALPHA_FEATURES = [
  'Everything in Pro',
  'Edge score on every market',
  'Kelly-optimal position sizing',
  'Entry / exit timing signals',
  'Instant alerts when edge is found',
  'AI accuracy track record',
]

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: '$0',
    period: 'forever',
    tagline: 'Track everything. No credit card.',
    features: FREE_FEATURES,
    cta: 'Get started',
    accent: false,
    featured: false,
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: '$14.99',
    period: '/month',
    tagline: 'AI analysis across all four markets.',
    features: PRO_FEATURES,
    cta: 'Upgrade to Pro',
    accent: true,
    featured: true,
  },
  {
    id: 'alpha' as const,
    name: 'Alpha',
    price: '$39.99',
    period: '/month',
    tagline: 'Full edge suite for serious traders.',
    features: ALPHA_FEATURES,
    cta: 'Upgrade to Alpha',
    accent: false,
    featured: false,
  },
]

const CHECK_ICON = (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="6.5" fill="currentColor" fillOpacity="0.12"/>
    <path d="M3.5 6.5l2 2L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ── Component ─────────────────────────────────────────────────────────────────

export default function PricingClient() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuthContext()
  const [loadingPlan, setLoadingPlan] = useState<'pro' | 'alpha' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { openCheckout } = usePaddle(async (transactionId) => {
    try { await api.activatePro(transactionId) } catch { /* webhook may have already handled */ }
    await refreshProfile()
  })

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
      setError('Failed to start checkout. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const currentPlan = profile?.plan ?? 'free'

  return (
    <div className="min-h-screen font-mono" style={{ background: 'rgb(var(--bg-base))' }}>

      {/* Navbar */}
      <header
        className="h-14 flex items-center px-8 border-b"
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
                Go to app →
              </Link>
            ) : (
              <>
                <Link
                  href="/auth?mode=signin"
                  className="text-xs font-mono transition-colors"
                  style={{ color: 'rgb(var(--text-muted))' }}
                >
                  Sign in
                </Link>
                <Link
                  href="/auth?mode=signup"
                  className="text-xs font-mono px-3 py-1.5 rounded"
                  style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--bg-base))' }}
                >
                  Start for free →
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-20">

        {/* Header */}
        <div className="text-center mb-16">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6"
            style={{ background: 'rgb(var(--accent) / 0.08)', border: '1px solid rgb(var(--accent) / 0.2)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--accent))' }} />
            <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgb(var(--accent))' }}>
              SIMPLE PRICING
            </span>
          </div>
          <h1
            className="font-bold text-text-primary mb-4"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
          >
            Track free.<br />
            <span style={{ color: 'rgb(var(--accent))' }}>Analyse with Pro.</span>
          </h1>
          <p className="text-sm max-w-lg mx-auto" style={{ color: 'rgb(var(--text-secondary))', lineHeight: 1.7 }}>
            Start for free — prediction markets, sports, esports and crypto.
            Upgrade for AI edge analysis when you're ready.
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id
            const isLoading = loadingPlan === plan.id

            return (
              <div
                key={plan.id}
                style={{
                  background: plan.featured ? 'rgb(var(--bg-surface))' : 'rgb(var(--bg-surface))',
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
                    MOST POPULAR
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
                        CURRENT
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
                  {isLoading ? 'LOADING...' : isCurrentPlan ? 'Current plan' : plan.cta}
                </button>

                {/* Divider */}
                <div className="h-px mb-6" style={{ background: 'rgb(var(--bg-border))' }} />

                {/* Features */}
                <div className="flex flex-col gap-3 flex-1">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2.5">
                      <span
                        className="shrink-0 mt-0.5"
                        style={{ color: plan.featured ? 'rgb(var(--accent))' : 'rgb(var(--text-secondary))' }}
                      >
                        {CHECK_ICON}
                      </span>
                      <span className="text-xs leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Cancel anytime note */}
                {plan.id !== 'free' && (
                  <p className="text-[10px] text-center mt-6" style={{ color: 'rgb(var(--text-muted))' }}>
                    Cancel anytime · Billed via Paddle
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2
            className="font-bold text-center mb-10"
            style={{ fontSize: '20px', color: 'rgb(var(--text-primary))' }}
          >
            Common questions
          </h2>
          <div className="flex flex-col gap-6">
            {[
              {
                q: 'What counts as an "analysis"?',
                a: 'An analysis is when you ask Prescio AI to evaluate a specific market, match, or coin. Free users cannot run AI analyses. Pro and Alpha users have unlimited analyses.',
              },
              {
                q: 'Can I cancel anytime?',
                a: 'Yes. Cancel from your account settings at any time. You keep access until the end of the billing period — no partial refunds.',
              },
              {
                q: 'What is the difference between Pro and Alpha?',
                a: 'Pro gives you unlimited AI analysis and full market intelligence. Alpha adds the full edge suite: Kelly sizing, edge scores, timing signals, and instant alerts — for users who act on the analysis.',
              },
              {
                q: 'Which sports and esports are covered?',
                a: 'Football (soccer) across 15+ top leagues including Premier League, La Liga, Champions League, and more. Esports coverage is currently focused on Dota 2.',
              },
              {
                q: 'Is payment secure?',
                a: 'All payments are processed by Paddle, our Merchant of Record. Paddle handles billing, receipts, VAT/taxes, and refund requests. We never see your card details.',
              },
            ].map(({ q, a }) => (
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
            Questions? Contact us at{' '}
            <a href="mailto:support@prescio.io" className="underline" style={{ color: 'rgb(var(--text-secondary))' }}>
              support@prescio.io
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
