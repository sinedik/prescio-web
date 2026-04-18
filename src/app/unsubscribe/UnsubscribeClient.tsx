'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'

type Status = 'loading' | 'ok' | 'error'

export default function UnsubscribeClient() {
  const [status, setStatus] = useState<Status>('loading')
  const [type, setType] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) {
      setStatus('error')
      setError('Missing token.')
      return
    }
    fetch(`/api/user/unsubscribe?token=${encodeURIComponent(token)}`, { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || 'Failed to unsubscribe')
        }
        return res.json()
      })
      .then((data) => {
        setType(data.type || '')
        setStatus('ok')
      })
      .catch((e: Error) => {
        setError(e.message)
        setStatus('error')
      })
  }, [])

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8"><Logo size={26} textSize={18} /></div>

        {status === 'loading' && (
          <p className="text-sm font-mono text-text-muted animate-pulse">Processing...</p>
        )}

        {status === 'ok' && (
          <>
            <h1 className="text-lg font-mono font-bold text-text-primary mb-2">You&apos;re unsubscribed</h1>
            <p className="text-xs font-mono text-text-muted mb-6">
              {type === 'all'
                ? 'You won\u2019t receive any more email notifications from Prescio.'
                : `You won\u2019t receive the "${type.replace(/_/g, ' ')}" emails anymore.`}
            </p>
            <p className="text-[11px] font-mono text-text-muted mb-6">
              Changed your mind? Re-enable notifications in your profile settings.
            </p>
            <Link
              href="/profile"
              className="block w-full py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded text-center
                hover:bg-accent/90 transition-colors"
            >
              Go to profile
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-lg font-mono font-bold text-text-primary mb-2">Link is invalid</h1>
            <p className="text-xs font-mono text-text-muted mb-6">{error || 'This unsubscribe link is invalid or has expired.'}</p>
            <Link
              href="/profile"
              className="block w-full py-2.5 border border-bg-border text-text-secondary text-sm font-mono font-bold rounded text-center
                hover:border-text-muted transition-colors"
            >
              Manage preferences
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
