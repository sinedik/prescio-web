'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase/client'
import Logo from '../components/Logo'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

export default function ForgotPasswordPage() {
  const { lang } = useLang()
  const tr = useT(lang)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tr('forgot.error_default'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Logo size={26} textSize={18} />
        </div>

        <h1 className="text-lg font-mono font-bold text-text-primary mb-1">{tr('forgot.title')}</h1>
        <p className="text-xs font-mono text-text-muted mb-6">{tr('forgot.desc')}</p>

        {sent ? (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-center">
            <p className="text-sm font-mono text-accent mb-2">{tr('forgot.sent_title')}</p>
            <p className="text-xs font-mono text-text-muted mb-4">{tr('forgot.sent_desc')}</p>
            <Link
              href="/auth"
              className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
            >
              {tr('forgot.back')}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">{tr('auth.email_label')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-sm font-mono
                  text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50
                  transition-colors"
              />
            </div>

            {error && (
              <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded
                hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {loading ? tr('forgot.sending') : tr('forgot.send_btn')}
            </button>

            <Link
              href="/auth"
              className="text-center text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors"
            >
              {tr('forgot.back')}
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
