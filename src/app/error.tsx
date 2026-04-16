'use client'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-[10px] font-mono text-danger tracking-widest mb-3">ERROR</p>
        <h1 className="text-xl font-mono font-bold text-text-primary mb-2">Something went wrong</h1>
        <p className="text-sm font-mono text-text-muted mb-6">
          An unexpected error occurred. Try again or return to the home page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="py-2 px-4 bg-accent text-bg-base text-xs font-mono font-bold rounded hover:bg-accent/90 transition-colors"
          >
            Try again
          </button>
          <a
            href="/"
            className="py-2 px-4 border border-bg-border text-text-secondary text-xs font-mono font-bold rounded hover:border-text-muted transition-colors"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  )
}
