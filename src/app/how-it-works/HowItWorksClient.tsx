'use client'

import Link from 'next/link'
import Logo from '@/components/Logo'
import AppFooter from '@/components/AppFooter'
import { useLang } from '@/contexts/LanguageContext'
import { useT } from '@/lib/i18n'
import { useAuthContext } from '@/contexts/AuthContext'
import { IconFileText, IconLineChart, IconRadar, IconGitCompare, IconTarget, IconBolt } from '@/components/icons'

const MAX_W = '1100px'

export default function HowItWorksClient() {
  const { lang } = useLang()
  const tr = useT(lang)
  const { user } = useAuthContext()
  const authHref = user ? '/markets' : '/auth?mode=signup'

  return (
    <div className="min-h-screen font-mono" style={{ background: 'rgb(var(--bg-base))' }}>

      {/* Navbar */}
      <header
        className="h-14 flex items-center px-4 sm:px-8 border-b"
        style={{ borderColor: 'rgb(var(--bg-border))', background: 'rgb(var(--bg-base) / 0.95)' }}
      >
        <div className="flex items-center justify-between w-full mx-auto" style={{ maxWidth: MAX_W }}>
          <Link href="/">
            <Logo size={22} textSize={13} />
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/pricing"
              className="text-xs font-mono transition-colors"
              style={{ color: 'rgb(var(--text-muted))' }}
            >
              {tr('footer.pricing')}
            </Link>
            {user ? (
              <Link
                href="/markets"
                className="text-xs font-mono px-3 py-1.5 rounded border"
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

      {/* Hero */}
      <section
        className="relative"
        style={{
          padding: '120px clamp(16px, 4vw, 48px) 80px',
          background: `
            radial-gradient(ellipse 80% 60% at 50% 0%, rgb(var(--accent) / 0.06), transparent 70%),
            linear-gradient(180deg, rgb(var(--bg-surface) / 0.6) 0%, rgb(var(--bg-base)) 100%)
          `,
          borderBottom: '1px solid rgb(var(--bg-border))',
        }}
      >
        <div className="mx-auto text-center" style={{ maxWidth: MAX_W }}>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-6"
            style={{ background: 'rgb(var(--accent) / 0.08)', border: '1px solid rgb(var(--accent) / 0.2)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'rgb(var(--accent))' }} />
            <span className="text-[10px] font-bold tracking-wider" style={{ color: 'rgb(var(--accent))' }}>
              {tr('how_it_works.nav').toUpperCase()}
            </span>
          </div>
          <h1
            className="font-bold mb-5"
            style={{
              fontSize: 'clamp(32px, 5vw, 52px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'rgb(var(--text-primary))',
            }}
          >
            {tr('how_it_works.hero.h1')}
          </h1>
          <p
            className="mx-auto"
            style={{
              fontSize: '16px',
              maxWidth: '640px',
              lineHeight: 1.7,
              color: 'rgb(var(--text-secondary))',
            }}
          >
            {tr('how_it_works.hero.sub')}
          </p>
          <Link
            href={authHref}
            className="inline-flex items-center mt-10 px-6 py-3 rounded-lg text-sm font-bold transition-transform hover:-translate-y-0.5"
            style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--bg-base))' }}
          >
            {tr('how_it_works.hero.cta')}
          </Link>
        </div>
      </section>

      {/* Section 1 — Data Sources */}
      <section style={{ padding: '120px clamp(16px, 4vw, 48px)' }}>
        <div className="mx-auto" style={{ maxWidth: MAX_W }}>
          <h2
            className="text-center font-bold mb-14"
            style={{
              fontSize: 'clamp(24px, 3.2vw, 34px)',
              letterSpacing: '-0.02em',
              color: 'rgb(var(--text-primary))',
            }}
          >
            {tr('how_it_works.s1.title')}
          </h2>

          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}
          >
            {[
              { icon: IconFileText, title: tr('how_it_works.s1.c1.title'), desc: tr('how_it_works.s1.c1.desc') },
              { icon: IconLineChart, title: tr('how_it_works.s1.c2.title'), desc: tr('how_it_works.s1.c2.desc') },
              { icon: IconRadar, title: tr('how_it_works.s1.c3.title'), desc: tr('how_it_works.s1.c3.desc') },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: 'rgb(var(--bg-surface))',
                  border: '1px solid rgb(var(--bg-border))',
                  borderRadius: '16px',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{
                    width: 44,
                    height: 44,
                    background: 'rgb(var(--accent) / 0.1)',
                    border: '1px solid rgb(var(--accent) / 0.25)',
                    color: 'rgb(var(--accent))',
                  }}
                >
                  <Icon size={20} strokeWidth={1.75} />
                </div>
                <h3 className="font-bold" style={{ fontSize: '17px', color: 'rgb(var(--text-primary))' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgb(var(--text-secondary))', lineHeight: 1.75 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2 — AI Analysis */}
      <section
        style={{
          padding: '120px clamp(16px, 4vw, 48px)',
          background: 'rgb(var(--bg-surface) / 0.4)',
          borderTop: '1px solid rgb(var(--bg-border))',
          borderBottom: '1px solid rgb(var(--bg-border))',
        }}
      >
        <div className="mx-auto" style={{ maxWidth: MAX_W }}>
          <h2
            className="text-center font-bold mb-14"
            style={{
              fontSize: 'clamp(24px, 3.2vw, 34px)',
              letterSpacing: '-0.02em',
              color: 'rgb(var(--text-primary))',
            }}
          >
            {tr('how_it_works.s2.title')}
          </h2>

          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))' }}
          >
            {[
              { icon: IconGitCompare, title: tr('how_it_works.s2.p1.title'), desc: tr('how_it_works.s2.p1.desc') },
              { icon: IconTarget,     title: tr('how_it_works.s2.p2.title'), desc: tr('how_it_works.s2.p2.desc') },
              { icon: IconBolt,       title: tr('how_it_works.s2.p3.title'), desc: tr('how_it_works.s2.p3.desc') },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="relative"
                style={{
                  padding: '28px',
                  borderRadius: '16px',
                  background: 'rgb(var(--bg-base))',
                  border: '1px solid rgb(var(--bg-border))',
                }}
              >
                <span
                  className="absolute -top-3 left-7 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider"
                  style={{ background: 'rgb(var(--bg-base))', color: 'rgb(var(--accent))', border: '1px solid rgb(var(--accent) / 0.3)' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Icon size={22} strokeWidth={1.75} style={{ color: 'rgb(var(--accent))', marginBottom: 16 }} />
                <h3 className="font-bold mb-2" style={{ fontSize: '16px', color: 'rgb(var(--text-primary))' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgb(var(--text-secondary))', lineHeight: 1.7 }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Your workflow */}
      <section style={{ padding: '120px clamp(16px, 4vw, 48px)' }}>
        <div className="mx-auto" style={{ maxWidth: MAX_W }}>
          <h2
            className="text-center font-bold mb-14"
            style={{
              fontSize: 'clamp(24px, 3.2vw, 34px)',
              letterSpacing: '-0.02em',
              color: 'rgb(var(--text-primary))',
            }}
          >
            {tr('how_it_works.s3.title')}
          </h2>

          <ol className="flex flex-col gap-4 mx-auto" style={{ maxWidth: '760px' }}>
            {[
              { title: tr('how_it_works.s3.step1.title'), desc: tr('how_it_works.s3.step1.desc') },
              { title: tr('how_it_works.s3.step2.title'), desc: tr('how_it_works.s3.step2.desc') },
              { title: tr('how_it_works.s3.step3.title'), desc: tr('how_it_works.s3.step3.desc') },
              { title: tr('how_it_works.s3.step4.title'), desc: tr('how_it_works.s3.step4.desc') },
            ].map(({ title, desc }, i) => (
              <li
                key={title}
                className="flex items-start gap-5"
                style={{
                  padding: '20px 24px',
                  background: 'rgb(var(--bg-surface))',
                  border: '1px solid rgb(var(--bg-border))',
                  borderRadius: '12px',
                }}
              >
                <span
                  className="flex items-center justify-center shrink-0 font-bold rounded-lg"
                  style={{
                    width: 36,
                    height: 36,
                    fontSize: 14,
                    background: 'rgb(var(--accent) / 0.1)',
                    color: 'rgb(var(--accent))',
                    border: '1px solid rgb(var(--accent) / 0.3)',
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold mb-1.5" style={{ fontSize: '15px', color: 'rgb(var(--text-primary))' }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'rgb(var(--text-secondary))', lineHeight: 1.7 }}>
                    {desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Footer CTA */}
      <section
        style={{
          padding: '120px clamp(16px, 4vw, 48px)',
          background: `
            radial-gradient(ellipse 60% 80% at 50% 50%, rgb(var(--accent) / 0.08), transparent 70%),
            rgb(var(--bg-surface) / 0.5)
          `,
          borderTop: '1px solid rgb(var(--bg-border))',
        }}
      >
        <div className="mx-auto text-center" style={{ maxWidth: MAX_W }}>
          <h2
            className="font-bold mb-8"
            style={{
              fontSize: 'clamp(28px, 4vw, 42px)',
              letterSpacing: '-0.02em',
              color: 'rgb(var(--text-primary))',
            }}
          >
            {tr('how_it_works.footer.title')}
          </h2>
          <Link
            href={authHref}
            className="inline-flex items-center px-7 py-3.5 rounded-lg text-sm font-bold transition-transform hover:-translate-y-0.5"
            style={{ background: 'rgb(var(--accent))', color: 'rgb(var(--bg-base))' }}
          >
            {tr('how_it_works.footer.cta')}
          </Link>
        </div>
      </section>

      <AppFooter />
    </div>
  )
}
