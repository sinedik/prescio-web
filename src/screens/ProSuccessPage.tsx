'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'

const UNLOCKED = [
  'Unlimited analyses per day',
  'Kelly sizing on every market',
  'Email alerts when edge ≥ 15%',
  'Unlimited portfolio positions',
  'Weekly digest reports',
]

export default function ProSuccessPage() {
  const router = useRouter()
  const { refreshProfile } = useAuthContext()

  useEffect(() => {
    refreshProfile()
  }, [])

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center animate-fade-in">
        {/* Badge */}
        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-mono text-accent tracking-wider">PRO PLAN ACTIVE</span>
        </div>

        <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">Welcome to Pro!</h1>
        <p className="text-sm font-mono text-text-muted mb-8">Everything is now unlocked.</p>

        <div className="bg-bg-surface border border-bg-border rounded-xl p-4 mb-6 text-left">
          <p className="text-[9px] font-mono text-text-muted tracking-wider mb-3">UNLOCKED FOR YOU</p>
          <div className="flex flex-col gap-2.5">
            {UNLOCKED.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                  <svg className="w-2 h-2 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-mono text-text-secondary">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.replace('/markets')}
          className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
            hover:bg-accent/90 transition-colors"
        >
          Start exploring →
        </button>
      </div>
    </div>
  )
}
