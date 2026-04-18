'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../lib/supabase/client'
import Logo from '../components/Logo'

export default function CheckInboxScreen() {
  const params = useSearchParams()
  const email = params.get('email') ?? ''
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function resend() {
    if (!email) return
    setResending(true)
    setError(null)
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    })
    setResending(false)
    if (error) setError(error.message)
    else setResent(true)
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Logo size={20} textSize={12} />
        </div>

        <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mb-5">
          <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
          </svg>
        </div>

        <h1 className="text-xl font-mono font-bold text-text-primary mb-2">Check your inbox</h1>
        <p className="text-sm font-mono text-text-secondary leading-relaxed mb-1">
          We sent a confirmation link to
        </p>
        {email && (
          <p className="text-sm font-mono text-text-primary break-all mb-4">{email}</p>
        )}
        <p className="text-xs font-mono text-text-muted leading-relaxed mb-6">
          Click the link in the email to activate your account. The link is valid for 1 hour.
        </p>

        {error && (
          <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        {resent && (
          <div className="text-xs font-mono text-accent bg-accent/5 border border-accent/20 rounded px-3 py-2 mb-3">
            Confirmation email re-sent.
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={resend}
            disabled={!email || resending || resent}
            className="w-full py-2.5 bg-bg-surface border border-bg-border text-text-primary text-sm font-mono
              font-bold rounded hover:border-text-muted transition-colors disabled:opacity-50"
          >
            {resending ? 'Sending...' : resent ? 'Sent' : 'Resend email'}
          </button>
          <Link
            href="/auth"
            className="w-full py-2.5 text-center text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
          >
            Back to sign in
          </Link>
        </div>

        <p className="text-[10px] font-mono text-text-muted mt-6 leading-relaxed">
          Can&apos;t find the email? Check your spam folder or try a different address.
        </p>
      </div>
    </div>
  )
}
