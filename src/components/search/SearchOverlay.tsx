'use client'
import { useState, useEffect, useRef } from 'react'
import { performSearchAction, triggerSearchAnalysisAction } from '../../actions/search'
import type { SubscriptionPlan } from '../../types/index'
import { useLang } from '../../contexts/LanguageContext'
import { useT } from '../../lib/i18n'

interface Props { isOpen: boolean; onClose: () => void; plan: SubscriptionPlan }
type State = 'idle' | 'searching' | 'done' | 'error'

export function SearchOverlay({ isOpen, onClose, plan }: Props) {
  const { lang } = useLang()
  const t = useT(lang)
  const [query, setQuery] = useState('')
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<{ searchId: string; summary: string; category?: string } | null>(null)
  const [analysisQueued, setAnalysisQueued] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const canSearch = plan !== 'free'

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
    else { setQuery(''); setState('idle'); setResult(null); setAnalysisQueued(false) }
  }, [isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSearch() {
    if (!query.trim() || state === 'searching' || !canSearch) return
    setState('searching')
    setResult(null)
    try {
      const res = await performSearchAction(query)
      setResult({ searchId: res.searchId, summary: res.summary, category: res.category })
      setState('done')
    } catch { setState('error') }
  }

  async function handleAnalyze() {
    if (!result) return
    try {
      await triggerSearchAnalysisAction(result.searchId)
      setAnalysisQueued(true)
    } catch { /* ignore */ }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-2xl rounded-xl flex flex-col mx-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '80vh', overflow: 'hidden' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <span style={{ color: 'var(--text-muted)' }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={canSearch ? t('search.placeholder') : t('search.placeholder_locked')}
            disabled={!canSearch}
            className="flex-1 bg-transparent outline-none"
            style={{ fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'inherit' }}
          />
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: '11px' }}>ESC</button>
        </div>

        {/* Paywall для free */}
        {!canSearch && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{t('search.paywall_desc')}</p>
            <a
              href="/profile?tab=subscription"
              className="px-4 py-2 rounded-md text-sm font-medium"
              style={{ background: 'var(--accent)', color: 'var(--bg-base)' }}
            >
              {t('search.upgrade_cta')}
            </a>
          </div>
        )}

        {/* Loading */}
        {state === 'searching' && (
          <div className="flex items-center justify-center gap-3 p-8">
            <div className="w-4 h-4 rounded-full animate-spin" style={{ border: '2px solid var(--border)', borderTopColor: 'var(--accent)' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('search.searching')}</span>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <p className="p-6 text-center" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{t('search.error')}</p>
        )}

        {/* Result */}
        {state === 'done' && result && (
          <div className="flex flex-col gap-4 p-4 overflow-y-auto">
            {result.category && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {result.category}
              </span>
            )}
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.7 }}>{result.summary}</p>
            <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              {analysisQueued ? (
                <span style={{ fontSize: '12px', color: 'var(--accent)' }}>{t('search.analysis_queued')}</span>
              ) : (
                <button
                  onClick={handleAnalyze}
                  className="px-3 py-1.5 rounded-md font-medium transition-opacity hover:opacity-80"
                  style={{ background: 'var(--accent)', color: 'var(--bg-base)', fontSize: '12px' }}
                >
                  {t('search.run_analysis')}
                </button>
              )}
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t('search.analysis_credit')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
