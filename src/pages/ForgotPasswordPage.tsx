import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Logo from '../components/Logo'

export default function ForgotPasswordPage() {
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
        redirectTo: `${window.location.origin}/auth`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset link')
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

        <h1 className="text-lg font-mono font-bold text-text-primary mb-1">Reset password</h1>
        <p className="text-xs font-mono text-text-muted mb-6">
          Enter your email and we'll send a reset link.
        </p>

        {sent ? (
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 text-center">
            <p className="text-sm font-mono text-accent mb-2">Reset link sent</p>
            <p className="text-xs font-mono text-text-muted mb-4">Check your email inbox.</p>
            <Link
              to="/auth"
              className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">EMAIL</label>
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
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>

            <Link
              to="/auth"
              className="text-center text-[10px] font-mono text-text-muted hover:text-text-secondary transition-colors"
            >
              ← Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
