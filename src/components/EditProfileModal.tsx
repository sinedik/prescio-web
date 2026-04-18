'use client'
import { useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'

const COUNTRY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '—' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'RU', label: 'Russia' },
  { value: 'KZ', label: 'Kazakhstan' },
  { value: 'UA', label: 'Ukraine' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'OTHER', label: 'Other' },
]

const EXPERIENCE_OPTIONS = ['beginner', 'experienced', 'pro'] as const

interface Props {
  onClose: () => void
}

export default function EditProfileModal({ onClose }: Props) {
  const { profile, updateProfile } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [experience, setExperience] = useState(profile?.trading_experience ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateProfile({
        display_name: displayName.trim() || undefined,
        country: country || undefined,
        trading_experience: experience || undefined,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgb(var(--bg-base) / 0.85)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm bg-bg-surface border border-bg-border rounded-2xl p-6 animate-slide-up">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-mono text-text-muted tracking-wider mb-1">{tr('profile.edit')}</p>
            <h2 className="text-lg font-mono font-bold text-text-primary leading-tight">{tr('profile.edit_title')}</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors mt-0.5">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-5">
          <div>
            <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">
              {tr('profile.display_name_label')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={tr('profile.display_name_placeholder')}
              maxLength={40}
              className="w-full bg-bg-base border border-bg-border rounded px-3 py-2 text-sm font-mono
                text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40
                transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">
              {tr('profile.country_label')}
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-bg-base border border-bg-border rounded px-3 py-2 text-sm font-mono
                text-text-primary focus:outline-none focus:border-accent/40 transition-colors"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-1.5">
              {tr('profile.experience_label')}
            </label>
            <select
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="w-full bg-bg-base border border-bg-border rounded px-3 py-2 text-sm font-mono
                text-text-primary focus:outline-none focus:border-accent/40 transition-colors"
            >
              <option value="">—</option>
              {EXPERIENCE_OPTIONS.map((e) => (
                <option key={e} value={e}>{tr(`profile.exp.${e}` as Parameters<typeof tr>[0])}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="text-xs font-mono text-danger bg-danger/5 border border-danger/20 rounded px-3 py-2 mb-3">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 border border-bg-border text-text-secondary text-sm font-mono font-bold
              rounded-lg hover:border-text-muted transition-colors disabled:opacity-50"
          >
            {tr('profile.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 bg-accent text-bg-base text-sm font-mono font-bold
              rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? tr('profile.saving') : tr('profile.save_changes')}
          </button>
        </div>
      </div>
    </div>
  )
}
