'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

type ProviderId = 'google' | 'twitter'

interface Identity {
  provider: string
  id: string
  identity_id?: string
  email?: string
}

const PROVIDERS: { id: ProviderId; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'twitter', label: 'Twitter / X' },
]

export default function LinkedIdentities() {
  const { lang } = useLang()
  const tr = useT(lang)
  const [identities, setIdentities] = useState<Identity[]>([])
  const [hasPassword, setHasPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<ProviderId | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const [idRes, userRes] = await Promise.all([
      supabase.auth.getUserIdentities(),
      supabase.auth.getUser(),
    ])
    setIdentities((idRes.data?.identities ?? []) as Identity[])
    // has_password — кастомный флаг в app_metadata, который выставляется
    // при signup (email+password) или при явной установке пароля.
    // Email-identity может быть и у magic-link юзеров, им нельзя unlink последний OAuth.
    const meta = userRes.data.user?.app_metadata as { has_password?: boolean } | undefined
    setHasPassword(Boolean(meta?.has_password))
    setLoading(false)
  }

  useEffect(() => { void refresh() }, [])

  const linkedProviders = new Set(identities.map((i) => i.provider))
  const externalCount = identities.filter((i) => i.provider !== 'email').length

  async function handleLink(provider: ProviderId) {
    setError(null)
    setBusy(provider)
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback?next=/profile` },
      })
      if (error) throw error
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Link failed')
      setBusy(null)
    }
  }

  async function handleUnlink(provider: ProviderId) {
    setError(null)
    const identity = identities.find((i) => i.provider === provider)
    if (!identity) return
    if (!hasPassword && externalCount <= 1) {
      setError(tr('linked.need_another'))
      return
    }
    setBusy(provider)
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity as never)
      if (error) throw error
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unlink failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {loading ? (
        <p className="text-[11px] font-mono text-text-muted animate-pulse">{tr('profile.loading')}</p>
      ) : (
        PROVIDERS.map(({ id, label }) => {
          const linked = linkedProviders.has(id)
          return (
            <div key={id} className="flex items-center justify-between">
              <span className="text-xs font-mono text-text-secondary">{label}</span>
              <button
                onClick={() => (linked ? handleUnlink(id) : handleLink(id))}
                disabled={busy === id}
                className={`text-[11px] font-mono font-bold px-3 py-1 rounded border transition-colors disabled:opacity-50 ${
                  linked
                    ? 'border-bg-border text-text-muted hover:border-danger/40 hover:text-danger'
                    : 'border-accent/30 text-accent hover:bg-accent/5'
                }`}
              >
                {busy === id ? tr('profile.loading') : linked ? tr('linked.unlink') : tr('linked.link')}
              </button>
            </div>
          )
        })
      )}
      {error && (
        <p className="text-[11px] font-mono text-danger mt-1">{error}</p>
      )}
    </div>
  )
}
