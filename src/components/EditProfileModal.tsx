'use client'
import { useRef, useState } from 'react'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase/client'
import { useLang } from '../contexts/LanguageContext'
import { useT } from '../lib/i18n'
import { useFocusTrap } from '../hooks/useFocusTrap'

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
  const { user, profile, updateProfile } = useAuthContext()
  const { lang } = useLang()
  const tr = useT(lang)
  const trapRef = useFocusTrap<HTMLDivElement>(onClose)

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [country, setCountry] = useState(profile?.country ?? '')
  const [experience, setExperience] = useState(profile?.trading_experience ?? '')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAvatarFile(file: File) {
    if (!user) return
    if (file.size > 2 * 1024 * 1024) {
      setError(tr('profile.avatar_too_large'))
      return
    }
    setError(null)
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function removeAvatar() {
    setAvatarUrl(null)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateProfile({
        display_name: displayName.trim() || undefined,
        country: country || undefined,
        trading_experience: experience || undefined,
        avatar_url: avatarUrl ?? null,
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
      <div ref={trapRef} role="dialog" aria-modal="true" className="w-full max-w-sm bg-bg-surface border border-bg-border rounded-2xl p-6 animate-slide-up">
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
            <label className="block text-[10px] font-mono text-text-muted tracking-wider mb-2">
              {tr('profile.avatar')}
            </label>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-bg-base border border-bg-border flex items-center justify-center shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-mono font-bold text-text-muted">
                    {(profile?.display_name || user?.email || '?').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-[11px] font-mono font-bold px-3 py-1.5 rounded border border-bg-border
                    text-text-secondary hover:border-text-muted hover:text-text-primary transition-colors disabled:opacity-50 w-fit"
                >
                  {uploading ? tr('profile.uploading') : avatarUrl ? tr('profile.avatar_change') : tr('profile.avatar_upload')}
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={removeAvatar}
                    className="text-[10px] font-mono text-text-muted hover:text-danger transition-colors w-fit"
                  >
                    {tr('profile.avatar_remove')}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleAvatarFile(f)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="text-[10px] font-mono text-text-muted mt-2">{tr('profile.avatar_hint')}</p>
          </div>

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
