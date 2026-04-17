'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

export default function ProSuccessPage() {
  const router = useRouter()
  const { refreshProfile } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)

  useEffect(() => {
    refreshProfile()
  }, [])

  const UNLOCKED_KEYS = [
    'prosuccess.f1',
    'prosuccess.f2',
    'prosuccess.f3',
    'prosuccess.f4',
  ] as const

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-3 py-1 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-mono text-accent tracking-wider">{tr('prosuccess.badge')}</span>
        </div>

        <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">{tr('prosuccess.title')}</h1>
        <p className="text-sm font-mono text-text-muted mb-8">{tr('prosuccess.subtitle')}</p>

        <div className="bg-bg-surface border border-bg-border rounded-xl p-4 mb-6 text-left">
          <p className="text-[9px] font-mono text-text-muted tracking-wider mb-3">{tr('prosuccess.unlocked')}</p>
          <div className="flex flex-col gap-2.5">
            {UNLOCKED_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2.5">
                <div className="w-3.5 h-3.5 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center shrink-0">
                  <svg className="w-2 h-2 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-xs font-mono text-text-secondary">{tr(key)}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.replace('/markets')}
          className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
            hover:bg-accent/90 transition-colors"
        >
          {tr('prosuccess.cta')}
        </button>
      </div>
    </div>
  )
}
