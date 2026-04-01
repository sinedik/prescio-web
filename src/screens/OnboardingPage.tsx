'use client'
import React, { useState, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { authApi } from '../lib/api'
import Logo from '../components/Logo'
import { CATEGORIES } from '../lib/categories'
import { IconSprout, IconTrendUp, IconStar, IconGlobe, IconMapPin } from '../components/icons'
import type { TopCategory } from '../types/index'

interface SelectedInterest { category: TopCategory; subcategory?: string }

const COUNTRIES = [
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

export default function OnboardingPage() {
  const router = useRouter()
  const { user, profile, refreshProfile } = useAuthContext()
  const [step, setStep] = useState(0)

  // Step 0 data
  const [displayName, setDisplayName] = useState('')
  const [country, setCountry] = useState('')
  const [experience, setExperience] = useState('')
  const [stake, setStake] = useState('')

  // Step 4 data
  const [selectedCategories, setSelectedCategories] = useState<TopCategory[]>([])
  const [selectedSubs, setSelectedSubs] = useState<Record<string, string[]>>({})
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

  async function handleStep0Continue() {
    if (!user) return
    const update: Record<string, string> = {}
    if (displayName.trim()) update.display_name = displayName.trim()
    if (country) update.country = country
    if (experience) update.trading_experience = experience
    if (stake) update.typical_stake_usd = stake
    if (Object.keys(update).length > 0) {
      await supabase.from('profiles').update(update).eq('id', user.id)
    }
    setStep(1)
  }

  async function finish() {
    if (!user) return
    setSaving(true)
    // Собираем interests для API
    const interests: SelectedInterest[] = selectedCategories.flatMap(cat => {
      const subs = selectedSubs[cat]
      if (subs && subs.length > 0) {
        return subs.map(sub => ({ category: cat, subcategory: sub }))
      }
      return [{ category: cat }]
    })
    try {
      await authApi.updateInterests(interests)
    } catch { /* ignore — interests are optional */ }
    await supabase.from('profiles').update({ onboarding_done: true }).eq('id', user.id)
    await refreshProfile()
    router.replace('/markets')
  }

  function toggleCategory(cat: TopCategory) {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
    // Сбрасываем подкатегории при снятии категории
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

      {/* Progress dots — 5 steps */}
      <div className="flex justify-center gap-2 pt-6">
        {[0, 1, 2, 3, 4].map((i) => (
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
          <Step0
            displayName={displayName}
            setDisplayName={setDisplayName}
            country={country}
            setCountry={setCountry}
            experience={experience}
            setExperience={setExperience}
            stake={stake}
            setStake={setStake}
            onContinue={handleStep0Continue}
            onSkip={skip}
          />
        )}
        {step === 1 && <Step1 onNext={() => setStep(2)} />}
        {step === 2 && <Step2 onNext={() => setStep(3)} />}
        {step === 3 && <Step3 onNext={() => setStep(4)} />}
        {step === 4 && (
          <Step4
            selectedCategories={selectedCategories}
            selectedSubs={selectedSubs}
            onToggleCategory={toggleCategory}
            onToggleSubcategory={toggleSubcategory}
            onFinish={finish}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}

// ── Step 0 — Tell us about yourself ─────────────────────────────────────────

interface Step0Props {
  displayName: string; setDisplayName: (v: string) => void
  country: string; setCountry: (v: string) => void
  experience: string; setExperience: (v: string) => void
  stake: string; setStake: (v: string) => void
  onContinue: () => void
  onSkip: () => void
}

const EXPERIENCE_OPTIONS: { id: string; icon: React.ReactNode; label: string; desc: string }[] = [
  { id: 'beginner',    icon: <IconSprout size={20} />,   label: 'Beginner',    desc: 'New to prediction markets' },
  { id: 'experienced', icon: <IconTrendUp size={20} />,  label: 'Experienced', desc: "I've traded before" },
  { id: 'pro',         icon: <IconStar size={20} />,     label: 'Pro',         desc: 'Full-time trader' },
]

const STAKE_OPTIONS = ['$10–50', '$50–200', '$200–1000', '$1000+']

function Step0({ displayName, setDisplayName, country, setCountry, experience, setExperience, stake, setStake, onContinue, onSkip }: Step0Props) {
  return (
    <div className="w-full animate-fade-in">
      <p className="text-[10px] font-mono text-accent tracking-widest mb-2">STEP 1 OF 5</p>
      <h1 className="text-2xl font-mono font-bold text-text-primary mb-1">Tell us about yourself</h1>
      <p className="text-sm font-mono text-text-muted mb-7">We'll personalize your experience</p>

      <div className="flex flex-col gap-5 mb-8">
        {/* Display name */}
        <div>
          <label className="block text-[10px] font-mono text-text-muted tracking-widest mb-1.5">DISPLAY NAME</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should we call you?"
            className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-sm font-mono
              text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/50
              transition-colors"
          />
        </div>

        {/* Country */}
        <div>
          <label className="flex items-center gap-1 text-[10px] font-mono text-text-muted tracking-widest mb-1.5"><IconMapPin size={11} /> COUNTRY</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full bg-bg-surface border border-bg-border rounded px-3 py-2.5 text-sm font-mono
              text-text-primary focus:outline-none focus:border-accent/50 transition-colors"
          >
            <option value="" className="bg-bg-surface text-text-muted">Select country</option>
            {COUNTRIES.map((c) => (
              <option key={c.value} value={c.value} className="bg-bg-surface">{c.label}</option>
            ))}
          </select>
        </div>

        {/* Trading experience */}
        <div>
          <label className="block text-[10px] font-mono text-text-muted tracking-widest mb-2">TRADING EXPERIENCE</label>
          <div className="grid grid-cols-3 gap-2.5">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setExperience(opt.id)}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all ${
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
        </div>

        {/* Typical stake */}
        <div>
          <label className="block text-[10px] font-mono text-text-muted tracking-widest mb-2">TYPICAL STAKE SIZE</label>
          <div className="grid grid-cols-4 gap-2">
            {STAKE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setStake(opt)}
                className={`py-2.5 rounded-lg border text-xs font-mono font-bold transition-all ${
                  stake === opt
                    ? 'bg-accent/10 border-accent text-accent'
                    : 'bg-bg-surface border-bg-border text-text-secondary hover:border-text-muted'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onContinue}
          className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
            hover:bg-accent/90 transition-colors"
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

// ── Step 1 — The market is often wrong ──────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div className="w-full animate-fade-in">
      <p className="text-[10px] font-mono text-accent tracking-widest mb-2">STEP 2 OF 5</p>
      <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">The market is often wrong.</h1>
      <p className="text-sm font-mono text-text-muted mb-8">
        Edge = the gap between what the market thinks and what's actually likely.
      </p>

      <div className="relative bg-bg-surface border border-bg-border rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-blue-400 bg-blue-400/10">POLYMARKET</span>
          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded text-accent bg-accent/10">BUY YES</span>
        </div>
        <p className="text-sm text-text-primary font-medium mb-4">Will US forces enter Iran by March 31?</p>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-elevated rounded-lg p-3 relative">
            <p className="text-[9px] font-mono text-text-muted tracking-wider mb-1">MKT %</p>
            <p className="text-xl font-mono font-bold text-text-secondary">8%</p>
            <div className="absolute -bottom-6 left-4 hidden sm:block">
              <div className="w-px h-5 bg-accent/40 mx-auto" />
              <p className="text-[9px] font-mono text-accent/70 whitespace-nowrap text-center mt-1">What the crowd thinks</p>
            </div>
          </div>
          <div className="bg-bg-elevated border border-accent/20 rounded-lg p-3 relative">
            <p className="text-[9px] font-mono text-text-muted tracking-wider mb-1">FAIR %</p>
            <p className="text-xl font-mono font-bold text-accent">35%</p>
            <div className="absolute -bottom-6 left-4 hidden sm:block">
              <div className="w-px h-5 bg-accent/40 mx-auto" />
              <p className="text-[9px] font-mono text-accent/70 whitespace-nowrap text-center mt-1">Our AI estimate</p>
            </div>
          </div>
          <div className="bg-bg-elevated border border-accent/40 rounded-lg p-3 relative">
            <p className="text-[9px] font-mono text-text-muted tracking-wider mb-1">EDGE</p>
            <p className="text-xl font-mono font-bold text-accent">+27pp</p>
            <div className="absolute -bottom-6 left-4 hidden sm:block">
              <div className="w-px h-5 bg-accent/40 mx-auto" />
              <p className="text-[9px] font-mono text-accent/70 whitespace-nowrap text-center mt-1">Your opportunity</p>
            </div>
          </div>
        </div>
        <div className="h-8 sm:h-10" />
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
          hover:bg-accent/90 transition-colors"
      >
        Got it →
      </button>
    </div>
  )
}

// ── Step 2 — How Prescio works ───────────────────────────────────────────────

function Step2({ onNext }: { onNext: () => void }) {
  const steps = [
    { icon: '⬡', title: 'Scan', desc: 'AI scans 3 platforms every 2h', sub: 'Polymarket · Kalshi · Metaculus' },
    { icon: '⬢', title: 'Analyze', desc: 'Compares with news & sources', sub: 'ISW · AP · Reuters · BBC' },
    { icon: '◈', title: 'Signal', desc: 'You see the edge first', sub: 'Before the crowd corrects' },
  ]

  return (
    <div className="w-full animate-fade-in">
      <p className="text-[10px] font-mono text-accent tracking-widest mb-2">STEP 3 OF 5</p>
      <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">How Prescio works</h1>
      <p className="text-sm font-mono text-text-muted mb-8">Three steps, every two hours.</p>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {steps.map((s, i) => (
          <div
            key={i}
            className="flex-1 bg-bg-surface border border-bg-border rounded-xl p-5 animate-slide-up"
            style={{ animationDelay: `${i * 200}ms`, animationFillMode: 'both' }}
          >
            <div className="text-2xl font-mono text-accent mb-3">{s.icon}</div>
            <p className="text-xs font-mono font-bold text-text-primary tracking-wider mb-1 uppercase">{s.title}</p>
            <p className="text-sm font-mono text-text-secondary mb-1">{s.desc}</p>
            <p className="text-[10px] font-mono text-text-muted">{s.sub}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
          hover:bg-accent/90 transition-colors"
      >
        Makes sense →
      </button>
    </div>
  )
}

// ── Step 3 — How to read an analysis ─────────────────────────────────────────

function Step3({ onNext }: { onNext: () => void }) {
  const highlights = [
    { label: 'FAIR VALUE', desc: 'AI estimate based on primary sources', color: 'text-accent border-accent/30' },
    { label: 'EDGE', desc: 'How mispriced this market is', color: 'text-watch border-watch/30' },
    { label: 'KELLY SIZING', desc: 'Recommended position size', color: 'text-poly border-poly/30' },
    { label: 'THESIS', desc: 'Why the market is wrong', color: 'text-text-secondary border-bg-border' },
    { label: 'RESOLUTION', desc: 'Exactly what needs to happen', color: 'text-text-secondary border-bg-border' },
  ]

  return (
    <div className="w-full animate-fade-in">
      <p className="text-[10px] font-mono text-accent tracking-widest mb-2">STEP 4 OF 5</p>
      <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">How to read an analysis</h1>
      <p className="text-sm font-mono text-text-muted mb-6">Every market comes with a full breakdown.</p>

      <div className="bg-bg-surface border border-bg-border rounded-xl p-4 mb-6">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-bg-elevated rounded p-2 border border-accent/20">
            <p className="text-[8px] font-mono text-text-muted mb-0.5">FAIR VALUE</p>
            <p className="text-lg font-mono font-bold text-accent">35%</p>
          </div>
          <div className="bg-bg-elevated rounded p-2 border border-watch/20">
            <p className="text-[8px] font-mono text-text-muted mb-0.5">EDGE</p>
            <p className="text-lg font-mono font-bold text-watch">+27pp</p>
          </div>
          <div className="bg-bg-elevated rounded p-2 border border-poly/20">
            <p className="text-[8px] font-mono text-text-muted mb-0.5">KELLY SIZE</p>
            <p className="text-lg font-mono font-bold text-poly">4.2%</p>
          </div>
        </div>
        <div className="text-xs font-mono text-text-muted bg-bg-elevated rounded p-2 mb-2 line-clamp-2">
          THESIS: ISW reports indicate no imminent escalation timeline. Market overpricing regime change risk based on isolated incidents.
        </div>
        <div className="text-[10px] font-mono text-text-muted bg-bg-elevated rounded p-2 line-clamp-1">
          RESOLUTION: US military forces must physically enter Iranian territory...
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        {highlights.map((h) => (
          <div key={h.label} className="flex items-center gap-3">
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${h.color}`}>
              {h.label}
            </span>
            <span className="text-xs font-mono text-text-muted">{h.desc}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
          hover:bg-accent/90 transition-colors"
      >
        Got it →
      </button>
    </div>
  )
}

// ── Step 4 — Interests ───────────────────────────────────────────────────────

function Step4({
  selectedCategories,
  selectedSubs,
  onToggleCategory,
  onToggleSubcategory,
  onFinish,
  saving,
}: {
  selectedCategories: TopCategory[]
  selectedSubs: Record<string, string[]>
  onToggleCategory: (cat: TopCategory) => void
  onToggleSubcategory: (cat: TopCategory, sub: string) => void
  onFinish: () => void
  saving: boolean
}) {
  return (
    <div className="w-full animate-fade-in">
      <p className="text-[10px] font-mono text-accent tracking-widest mb-2">STEP 5 OF 5</p>
      <h1 className="text-2xl font-mono font-bold text-text-primary mb-2">What markets interest you?</h1>
      <p className="text-sm font-mono text-text-muted mb-6">We'll prioritize relevant signals for you.</p>

      <div className="flex flex-col gap-3 mb-8">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategories.includes(cat.value)
          return (
            <div key={cat.value}>
              {/* Категория верхнего уровня */}
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

              {/* Подкатегории — раскрываются при выборе */}
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

      <button
        onClick={onFinish}
        disabled={saving}
        className="w-full py-3 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
          hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        {saving ? 'SAVING...' : 'Take me to the markets →'}
      </button>
    </div>
  )
}
