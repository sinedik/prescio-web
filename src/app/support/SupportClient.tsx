'use client'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { useLang } from '@/contexts/LanguageContext'
import { useT } from '@/lib/i18n'

const SUPPORT_EMAIL = 'support@prescio.io'
const LEGAL_EMAIL = 'legal@prescio.io'

export default function SupportClient() {
  const { lang } = useLang()
  const tr = useT(lang)

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-bg-border px-4 sm:px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/"><Logo size={24} textSize={16} /></Link>
          <Link
            href="/markets"
            className="text-[11px] font-mono text-text-muted hover:text-text-primary transition-colors"
          >
            ← {tr('support.back')}
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">{tr('support.title')}</h1>
        <p className="text-sm font-mono text-text-muted mb-8">{tr('support.subtitle')}</p>

        <section className="mb-8">
          <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted mb-3">
            {tr('support.contact_title')}
          </p>
          <div className="rounded-xl border border-bg-border bg-bg-surface p-5">
            <p className="text-sm font-mono text-text-secondary mb-4">{tr('support.contact_desc')}</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-block text-sm font-mono font-bold text-accent hover:text-accent/80 transition-colors"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </section>

        <section className="mb-8">
          <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted mb-3">
            {tr('support.billing_title')}
          </p>
          <div className="rounded-xl border border-bg-border bg-bg-surface p-5">
            <p className="text-sm font-mono text-text-secondary mb-4">{tr('support.billing_desc')}</p>
            <a
              href={`mailto:${LEGAL_EMAIL}`}
              className="inline-block text-sm font-mono font-bold text-accent hover:text-accent/80 transition-colors"
            >
              {LEGAL_EMAIL}
            </a>
          </div>
        </section>

        <section>
          <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-text-muted mb-3">
            {tr('support.docs_title')}
          </p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/terms" className="text-sm font-mono text-text-secondary hover:text-text-primary transition-colors">
                → {tr('profile.terms')}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-sm font-mono text-text-secondary hover:text-text-primary transition-colors">
                → {tr('profile.privacy')}
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}
