'use client'
import { useRouter } from 'next/navigation'
import type { SubscriptionPlan } from '../../types/index'

interface Props {
  requiredPlan: SubscriptionPlan
  currentPlan: SubscriptionPlan
  feature: string
  children: React.ReactNode
}

const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  free: 'Free', pro: 'Pro', alpha: 'Alpha',
}
const PLAN_PRICES: Record<SubscriptionPlan, string> = {
  free: '', pro: '$14.99/mo', alpha: '$39.99/mo',
}

export function PaywallBanner({ requiredPlan, currentPlan, feature, children }: Props) {
  const router = useRouter()
  const isBlocked =
    (currentPlan === 'free' && requiredPlan !== 'free') ||
    (currentPlan === 'pro' && requiredPlan === 'alpha')

  if (!isBlocked) return <>{children}</>

  return (
    <div className="relative overflow-hidden rounded-lg">
      <div className="pointer-events-none select-none" style={{ filter: 'blur(6px)', opacity: 0.4 }}>
        {children}
      </div>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg"
        style={{ background: `linear-gradient(to bottom, transparent, rgba(var(--bg-base-rgb), 0.95))` }}
      >
        <div className="flex flex-col items-center gap-2 text-center px-6">
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {PLAN_LABELS[requiredPlan]} feature
          </span>
          <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>
            {feature}
          </p>
          <button
            onClick={() => router.push('/profile?tab=subscription')}
            className="mt-1 px-4 py-2 rounded-md text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
          >
            Upgrade to {PLAN_LABELS[requiredPlan]} — {PLAN_PRICES[requiredPlan]}
          </button>
        </div>
      </div>
    </div>
  )
}
