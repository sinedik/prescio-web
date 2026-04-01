'use client'
import React, { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { authApi } from '../lib/api'
import Logo from '../components/Logo'
import { CATEGORIES } from '../lib/categories'
import { IconSprout, IconTrendUp, IconStar } from '../components/icons'
import type { TopCategory } from '../types/index'

interface SelectedInterest { category: TopCategory; subcategory?: string }

export default function OnboardingPage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuthContext()
  const [step, setStep] = useState(0)

  // Step 0 — interests
  const [selectedCategories, setSelectedCategories] = useState<TopCategory[]>([])
  const [selectedSubs, setSelectedSubs] = useState<Record<string, string[]>>({})

  // Step 1 — use case
  const [experience, setExperience] = useState('')

  const [saving, setSaving] = useState(false)

  useLayoutEffect(() => {
    if (profile?.onboarding_done) router.replace('/markets')
  }, [profile?.onboarding_done, router])

  if (profile?.onboarding_done) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--bg-base))' }}>
        <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
      </div>
    )
  }

  async function skip() {
    if (!user) return
    await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    await refreshProfile()
    router.replace('/markets')
  }

  async function finish() {
    if (!user) return
    setSaving(true)
    const interests: SelectedInterest[] = selectedCategories.flatMap(cat => {
      const subs = selectedSubs[cat]
      if (subs && subs.length > 0) {
        return subs.map(sub => ({ category: cat, subcategory: sub }))
      }
      return [{ category: cat }]
    })
    try {
      if (interests.length > 0) await authApi.updateInterests(interests)
      if (experience) {
        await supabase.from('profiles').update({ trading_experience: experience }).eq('id', user.id)
      }
    } catch { /* ignore — optional */ }
    await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    await refreshProfile()
    router.replace('/markets')
  }

  function toggleCategory(cat: TopCategory) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
    if (selectedCategories.includes(cat)) {
      setSelectedSubs(prev => { const next = { ...prev }; delete next[cat]; return next })
    }
  }

  function toggleSubcategory(cat: TopCategory, sub: string) {
    setSelectedSubs(prev => {
      const current = prev[cat] ?? []
      const next = current.includes(sub) ? current.filter(s => s !== sub) : [...current, sub]
      return { ...prev, [cat]: next }
    })
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-bg-border">
        <Logo size={22} textSize={14} />
        <button
          onClick={skip}
          className="text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Progress — 3 steps */}
      <div className="flex justify-center gap-2 pt-6">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-6 bg-accent' : i < step ? 'w-3 bg-accent/40' : 'w-3 bg-bg-elevated'
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-2xl mx-auto w-full">
        {step === 0 && (
          <StepInterests
            selectedCategories={selectedCategories}
            selectedSubs={selectedSubs}
            onToggleCategory={toggleCategory}
            onToggleSubcategory={toggleSubcategory}
            onNext={() => setStep(1)}
            onSkip={skip}
          />
        )}
        {step === 1 && (
          <StepUseCase
            experience={experience}
            setExperience={setExperience}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepReady
            onFinish={finish}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}

// ── Step 0 — What markets interest you? ─────────────────────────────────────

function StepInterests({
  selectedCategories,
  selectedSubs,
  onToggleCategory,
  onToggleSubcategory,
  onNext,
  onSkip,
}: {
  selectedCategories: TopCategory[]
  selectedSubs: Record<string, string[]>
  onToggleCategory: (cat: TopCategory) => void
  onToggleSubcategory: (cat: TopCategory, sub: string) => void
  onNext: () => void
  onSkip: () => void
}) {
  return (
    <div className="w-full animate-fade-in">
      <p className="text-[10px] font-mono text-accent tracking-widest mb-2">STEP 1 OF 3</p>
      <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">What markets interest you?</h1>
      <p className="text-sm font-mono text-text-muted mb-6">We'll prioritize relevant signals for you.</p>

      <div className="flex flex-col gap-3 mb-8">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategories.includes(cat.value)
          return (
            <div key={cat.value}>
              <button
                onClick={() => onToggleCategory(cat.value)}
                className={`w-full text-left py-3 px-4 rounded-xl border text-sm font-mono font-medium transition-all ${
                  isActive
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-bg-surface border-bg-border text-text-secondary hover:border-text-muted'
                }`}
              >
                {cat.label}
              </button>
              {isActive && cat.subcategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2 ml-4">
                  {cat.subcategories.map(sub => {
                    const subActive = (selectedSubs[cat.value] ?? []).includes(sub.value)
                    return (
                      <button
                        key={sub.value}
                        onClick={() => onToggleSubcategory(cat.value, sub.value)}
                        className={`py-1.5 px-3 rounded-lg border text-xs font-mono transition-all ${
                          subActive
                            ? 'bg-accent/10 border-accent/60 text-accent'
                            : 'bg-bg-elevated border-bg-border text-text-muted hover:border-text-muted'
                        }`}
                      >
                        {sub.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onNext}
          className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg hover:bg-accent/90 transition-colors"
        >
          Continue →
        </button>
        <button
          onClick={onSkip}
          className="w-full py-2 text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  )
}

// ── Step 1 — How do you use prediction markets? ──────────────────────────────

const EXPERIENCE_OPTIONS: { id: string; icon: React.ReactNode; label: string; desc: string }[] = [
  { id: 'beginner',    icon: <IconSprout size={20} />,   label: 'Beginner',    desc: 'New to prediction markets' },
  { id: 'experienced', icon: <IconTrendUp size={20} />,  label: 'Experienced', desc: "I've traded before" },
  { id: 'pro',         icon: <IconStar size={20} />,     label: 'Pro',         desc: 'Full-time trader' },
]

function StepUseCase({
  experience,
  setExperience,
  onNext,
}: {
  experience: string
  setExperience: (v: string) => void
  onNext: () => void
}) {
  return (
    <div className="w-full animate-fade-in">
      <p className="text-[10px] font-mono text-accent tracking-widest mb-2">STEP 2 OF 3</p>
      <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">How do you use prediction markets?</h1>
      <p className="text-sm font-mono text-text-muted mb-8">Help us tailor your analysis depth.</p>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {EXPERIENCE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setExperience(opt.id)}
            className={`flex flex-col items-center gap-2 py-5 px-3 rounded-xl border text-center transition-all ${
              experience === opt.id
                ? 'bg-accent/10 border-accent text-accent'
                : 'bg-bg-surface border-bg-border text-text-secondary hover:border-text-muted'
            }`}
          >
            <span className="flex items-center justify-center">{opt.icon}</span>
            <span className="text-xs font-mono font-bold">{opt.label}</span>
            <span className="text-[9px] font-mono text-text-muted leading-tight">{opt.desc}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg hover:bg-accent/90 transition-colors"
      >
        Continue →
      </button>
    </div>
  )
}

// ── Step 2 — You're all set! ─────────────────────────────────────────────────

function StepReady({ onFinish, saving }: { onFinish: () => void; saving: boolean }) {
  return (
    <div className="w-full animate-fade-in text-center">
      <p className="text-[10px] font-mono text-accent tracking-widest mb-2">STEP 3 OF 3</p>
      <div className="text-4xl font-mono font-bold text-accent mb-4">◈</div>
      <h1 className="text-2xl font-mono font-bold text-text-primary mb-3">You're all set.</h1>
      <p className="text-sm font-mono text-text-muted mb-10 max-w-sm mx-auto">
        Prescio is scanning markets right now. Your first edge signals are waiting.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-10 text-left">
        {[
          { icon: '⬡', title: 'Scan', desc: 'Markets scanned every 2h' },
          { icon: '⬢', title: 'Signal', desc: 'Edge scores for every event' },
          { icon: '◈', title: 'Act', desc: 'You see the edge first' },
        ].map((s, i) => (
          <div key={i} className="bg-bg-surface border border-bg-border rounded-xl p-4">
            <div className="text-xl font-mono text-accent mb-2">{s.icon}</div>
            <p className="text-[10px] font-mono font-bold text-text-primary tracking-wider mb-1 uppercase">{s.title}</p>
            <p className="text-[11px] font-mono text-text-muted">{s.desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onFinish}
        disabled={saving}
        className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        {saving ? 'SAVING...' : 'Take me to the markets →'}
      </button>
    </div>
  )
}
