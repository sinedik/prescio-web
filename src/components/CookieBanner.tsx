'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

const STORAGE_KEY = 'prescio_cookie_consent'

export default function CookieBanner() {
  const { lang } = useLang()
  const tr = useT(lang)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) setVisible(true)
    } catch { /* ignore */ }
  }, [])

  function save(choice: 'all' | 'essential') {
    try { localStorage.setItem(STORAGE_KEY, choice) } catch { /* ignore */ }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 rounded-lg border bg-bg-elevated shadow-xl"
      style={{ borderColor: 'rgb(var(--bg-border))' }}>
      <div className="p-4">
        <p className="text-xs font-mono text-text-secondary mb-3 leading-relaxed">
          {tr('cookie.desc')}{' '}
          <Link href="/privacy" className="text-accent hover:underline">{tr('cookie.learn')}</Link>
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => save('all')}
            className="flex-1 py-2 bg-accent text-bg-base text-[11px] font-mono font-bold rounded
              hover:bg-accent/90 transition-colors"
          >
            {tr('cookie.accept')}
          </button>
          <button
            onClick={() => save('essential')}
            className="flex-1 py-2 border border-bg-border text-[11px] font-mono font-bold rounded
              text-text-secondary hover:border-text-muted hover:text-text-primary transition-colors"
          >
            {tr('cookie.essential')}
          </button>
        </div>
      </div>
    </div>
  )
}
