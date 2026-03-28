import { useRef, useEffect, useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import Logo from '../components/Logo'
import AppFooter from '../components/AppFooter'
import { IconMoon, IconSun } from '../components/icons'

// ── Mock market cards (hero right panel) ─────────────────────────────────────
const MOCK_CARDS = [
  {
    platform: 'POLYMARKET', pc: 'text-blue-400 bg-blue-400/10',
    question: 'Will US forces enter Iran by March 31?',
    category: 'GEOPOLITICS', mkt: 8, no: 92, vol: '$27.8M', date: 'Resolves Mar 31',
    trend: [14, 11, 9, 10, 8, 8, 8], up: false,
  },
  {
    platform: 'KALSHI', pc: 'text-amber-400 bg-amber-400/10',
    question: 'Fed rate cut before July 2026?',
    category: 'POLICY', mkt: 62, no: 38, vol: '$18.4M', date: 'Resolves Jul 31',
    trend: [54, 57, 59, 61, 61, 62, 62], up: true,
  },
  {
    platform: 'POLYMARKET', pc: 'text-blue-400 bg-blue-400/10',
    question: 'Will Bitcoin reach $150k before end of 2026?',
    category: 'CRYPTO', mkt: 28, no: 72, vol: '$12.1M', date: 'Resolves Dec 31',
    trend: [22, 24, 25, 27, 28, 28, 28], up: true,
  },
  {
    platform: 'POLYMARKET', pc: 'text-blue-400 bg-blue-400/10',
    question: 'Russia-Ukraine ceasefire agreement in 2026?',
    category: 'GEOPOLITICS', mkt: 33, no: 67, vol: '$41.2M', date: 'Resolves Dec 31',
    trend: [27, 29, 31, 32, 33, 33, 33], up: true,
  },
  {
    platform: 'KALSHI', pc: 'text-amber-400 bg-amber-400/10',
    question: 'Iran ceasefire by April 30?',
    category: 'GEOPOLITICS', mkt: 18, no: 82, vol: '$52.5M', date: 'Resolves Apr 30',
    trend: [23, 21, 20, 19, 18, 18, 18], up: false,
  },
  {
    platform: 'METACULUS', pc: 'text-purple-400 bg-purple-400/10',
    question: 'AI system passes bar exam by mid-2026?',
    category: 'ELECTIONS', mkt: 71, no: 29, vol: '—', date: 'Resolves Jun 30',
    trend: [60, 63, 66, 68, 70, 71, 71], up: true,
  },
  {
    platform: 'POLYMARKET', pc: 'text-blue-400 bg-blue-400/10',
    question: 'US-China trade deal signed in 2026?',
    category: 'US_POLITICS', mkt: 45, no: 55, vol: '$15.2M', date: 'Resolves Dec 31',
    trend: [40, 41, 43, 44, 45, 45, 45], up: true,
  },
  {
    platform: 'KALSHI', pc: 'text-amber-400 bg-amber-400/10',
    question: 'Netanyahu leaves office before June 2026?',
    category: 'GEOPOLITICS', mkt: 31, no: 69, vol: '$73.3M', date: 'Resolves Jun 30',
    trend: [35, 34, 33, 32, 31, 31, 31], up: false,
  },
]

// Tiny sparkline SVG
function Sparkline({ data, up }: { data: number[]; up: boolean }) {
  const W = 52, H = 22
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const toX = (i: number) => (i / (data.length - 1)) * W
  const toY = (v: number) => H - 2 - ((v - min) / range) * (H - 4)
  const pts = data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  const color = up ? 'rgb(var(--accent))' : 'rgb(var(--danger))'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" opacity="0.8" />
      <circle cx={toX(data.length - 1)} cy={toY(data[data.length - 1])} r="2" fill={color} />
    </svg>
  )
}

function HeroCard({ card, index }: { card: typeof MOCK_CARDS[0]; index: number }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        background: `rgb(var(--bg-surface) / ${Math.max(0.5, 0.85 - index * 0.07)})`,
        border: '1px solid rgb(var(--bg-border))',
        opacity: Math.max(0.45, 1 - index * 0.06),
      }}
    >
      {/* Left: platform + question + stats */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-1">
          <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded uppercase tracking-wide ${card.pc}`}>
            {card.platform}
          </span>
          <span className="text-[8px] font-mono text-text-muted/60 border border-bg-border/40 px-1 py-0.5 rounded uppercase">
            {card.category.replace('_', ' ')}
          </span>
        </div>
        <p className="text-[11.5px] font-medium text-text-primary line-clamp-1 leading-snug">
          {card.question}
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-text-muted">
          <span className="text-text-secondary font-bold">YES {card.mkt}%</span>
          <span className="text-text-muted/50">·</span>
          <span>{card.vol}</span>
          <span className="text-text-muted/50">·</span>
          <span className="text-text-muted/70">{card.date}</span>
        </div>
      </div>

      {/* Right: sparkline */}
      <Sparkline data={card.trend} up={card.up} />
    </div>
  )
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function scrollFade(inView: boolean, delay = 0): React.CSSProperties {
  return {
    opacity: inView ? 1 : 0,
    transform: inView ? 'none' : 'translateY(24px)',
    transition: `opacity 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 600ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
  }
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, inView }
}

function useCountUp(target: number, duration: number, trigger: boolean) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let raf: number
    const start = performance.now()
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [trigger, target, duration])
  return value
}

function useNextScanMins() {
  const cycleMs = 120 * 60 * 1000
  const [mins, setMins] = useState(() => Math.ceil((cycleMs - (Date.now() % cycleMs)) / 60000))
  useEffect(() => {
    const id = setInterval(() => setMins(Math.ceil((cycleMs - (Date.now() % cycleMs)) / 60000)), 30000)
    return () => clearInterval(id)
  }, [cycleMs])
  return mins
}

// ── Section 1 — Stats strip ──────────────────────────────────────────────────
function StatsSection() {
  const { ref, inView } = useInView(0.3)
  const vol = useCountUp(500, 1800, inView)
  const platforms = useCountUp(3, 900, inView)

  const stats = [
    { display: `$${vol}M+`, label: 'Markets tracked' },
    { display: `${platforms}`, label: 'Platforms' },
    { display: '~2h', label: 'Scan interval' },
  ]

  return (
    <div
      ref={ref}
      style={{ background: 'rgb(var(--bg-surface))', borderTop: '1px solid rgb(var(--bg-border))', borderBottom: '1px solid rgb(var(--bg-border))' }}
    >
      <div
        className="mx-auto grid grid-cols-3"
        style={{ maxWidth: '1100px', padding: '40px clamp(16px, 4vw, 48px)' }}
      >
        {stats.map((s, i) => (
          <div key={i} className="relative flex flex-col items-center text-center" style={scrollFade(inView, i * 100)}>
            {i > 0 && (
              <div className="absolute left-0 top-3 bottom-3 w-px" style={{ background: 'rgb(var(--bg-border))' }} />
            )}
            <span
              className="font-mono font-bold"
              style={{ fontSize: 'clamp(32px, 4vw, 48px)', color: 'rgb(var(--accent))', lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {s.display}
            </span>
            <span
              className="font-mono mt-2 uppercase"
              style={{ fontSize: '11px', color: 'rgb(var(--text-secondary))', letterSpacing: '0.1em' }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Section 2 — Edge demo ────────────────────────────────────────────────────
function EdgeDemoSection() {
  const { ref, inView } = useInView(0.1)
  const [hl, setHl] = useState(0)

  useEffect(() => {
    if (!inView) return
    const timers = [400, 800, 1200, 1600].map((delay, i) =>
      window.setTimeout(() => setHl(i + 1), delay)
    )
    return () => timers.forEach(window.clearTimeout)
  }, [inView])

  const metricBoxStyle = (active: boolean, activeGreen: boolean): React.CSSProperties => ({
    background: active ? (activeGreen ? 'rgb(var(--accent) / 0.03)' : 'rgb(var(--bg-border))') : 'rgb(var(--bg-elevated))',
    border: `1px solid ${active ? (activeGreen ? 'rgb(var(--accent) / 0.25)' : 'rgb(var(--bg-border))') : 'rgb(var(--bg-border))'}`,
    borderRadius: '8px',
    padding: '12px',
    transition: 'background 400ms ease, border-color 400ms ease',
  })

  const explanations = [
    { label: 'What the crowd thinks', detail: 'Polymarket traders price a 9% chance — reflecting noise and fear, not analysis.' },
    { label: 'Our AI estimate', detail: 'Cross-referencing ISW and primary sources puts the real probability at 35%.' },
    { label: 'Your opportunity', detail: '26 percentage points of edge. The kind the market rarely offers twice.' },
    { label: 'Why the market is wrong', detail: 'Crowd conflates airstrikes with ground incursion. Resolution criteria says boots on ground only.' },
  ]

  return (
    <section style={{ padding: '120px 0' }}>
      <div ref={ref} className="mx-auto" style={{ maxWidth: '1100px', padding: '0 clamp(16px, 4vw, 48px)' }}>
        {/* Header */}
        <div className="text-center mb-14" style={scrollFade(inView)}>
          <h2 className="font-mono font-bold text-text-primary mb-3" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>
            This is what edge looks like
          </h2>
          <p className="font-mono" style={{ fontSize: '14px', color: 'rgb(var(--text-secondary))' }}>
            Market at 9%. Our AI says 35%. You see it first.
          </p>
        </div>

        {/* Two-column layout */}
        <div
          className="grid grid-cols-1 items-start gap-10"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))' }}
        >
          <div
            className="md:col-span-1"
            style={{
              ...scrollFade(inView, 100),
              gridColumn: 'span 1',
            }}
          >
            {/* Market Detail mock */}
            <div
              style={{
                background: 'rgb(var(--bg-surface))',
                border: '1px solid rgb(var(--bg-border))',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              {/* Badges row */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg text-blue-400 bg-blue-400/10">POLYMARKET</span>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg text-accent bg-accent/10">ENTER</span>
                <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg ml-auto"
                  style={{ color: 'rgb(var(--text-secondary))', background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}>
                  RESOLVES IN 3D
                </span>
              </div>

              {/* Title */}
              <h3 className="font-mono font-bold text-text-primary mb-5" style={{ fontSize: '15px', lineHeight: 1.5 }}>
                Will US forces enter Iran by March 31?
              </h3>

              {/* Metrics 2×2 */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div style={metricBoxStyle(hl >= 1, false)}>
                  <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: 'rgb(var(--text-muted))' }}>MARKET PRICE</p>
                  <p className="font-mono font-bold" style={{ fontSize: '22px', color: 'rgb(var(--text-secondary))' }}>9%</p>
                </div>
                <div style={metricBoxStyle(hl >= 2, true)}>
                  <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: 'rgb(var(--text-muted))' }}>FAIR VALUE</p>
                  <p className="font-mono font-bold" style={{ fontSize: '22px', color: 'rgb(var(--accent))' }}>35%</p>
                </div>
                <div style={metricBoxStyle(hl >= 3, true)}>
                  <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: 'rgb(var(--text-muted))' }}>EDGE</p>
                  <p className="font-mono font-bold" style={{ fontSize: '22px', color: 'rgb(var(--accent))' }}>+26pp</p>
                </div>
                <div style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))', borderRadius: '8px', padding: '12px' }}>
                  <p className="font-mono text-[9px] tracking-widest mb-1" style={{ color: 'rgb(var(--text-muted))' }}>VOLUME</p>
                  <p className="font-mono font-bold" style={{ fontSize: '22px', color: 'rgb(var(--text-secondary))' }}>$27.8M</p>
                </div>
              </div>

              {/* Recommendation */}
              <div style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
                <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: 'rgb(var(--text-muted))' }}>RECOMMENDATION</p>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg text-accent bg-accent/10">ENTER</span>
                  <span className="font-mono text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                    Bet 25.0% Kelly · Pot. <span style={{ color: 'rgb(var(--accent))' }}>+$61</span>
                  </span>
                </div>
              </div>

              {/* Thesis — lights up at hl>=4 */}
              <div
                style={{
                  background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))', borderRadius: '8px', padding: '12px', marginBottom: '8px',
                  opacity: hl >= 4 ? 1 : 0.35,
                  transition: 'opacity 500ms ease',
                }}
              >
                <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: 'rgb(var(--text-muted))' }}>THESIS</p>
                <p style={{ fontSize: '12px', color: 'rgb(var(--text-secondary))', lineHeight: 1.6 }}>
                  ISW reports indicate no imminent escalation timeline. Market is overpricing regime change risk based on isolated incidents rather than structural shifts in US-Iran relations.
                </p>
              </div>

              {/* Resolution */}
              <div style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))', borderRadius: '8px', padding: '12px' }}>
                <p className="font-mono text-[9px] tracking-widest mb-2" style={{ color: 'rgb(var(--text-muted))' }}>RESOLUTION CRITERIA</p>
                <p style={{ fontSize: '12px', color: 'rgb(var(--text-secondary))', lineHeight: 1.6 }}>
                  US military forces must physically enter Iranian sovereign territory. Airstrikes and proxy engagement do not qualify.
                </p>
              </div>
            </div>
          </div>

          {/* Right: explanation labels */}
          <div className="flex flex-col justify-start gap-3 pt-2" style={scrollFade(inView, 200)}>
            {explanations.map(({ label, detail }, i) => {
              const active = hl >= i + 1
              return (
                <div
                  key={i}
                  style={{
                    background: active ? 'rgb(var(--accent) / 0.06)' : 'transparent',
                    border: `1px solid ${active ? 'rgb(var(--accent) / 0.13)' : 'transparent'}`,
                    borderRadius: '12px',
                    padding: '16px',
                    transition: 'background 400ms ease, border-color 400ms ease',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="font-mono text-sm mt-0.5 shrink-0"
                      style={{ color: active ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))', transition: 'color 400ms ease' }}
                    >
                      →
                    </span>
                    <div>
                      <p
                        className="font-mono text-xs font-bold mb-1"
                        style={{ color: active ? 'rgb(var(--accent))' : 'rgb(var(--text-muted))', transition: 'color 400ms ease' }}
                      >
                        {label}
                      </p>
                      <p style={{ fontSize: '13px', color: 'rgb(var(--text-secondary))', lineHeight: 1.65 }}>{detail}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Section 3 — How it works ──────────────────────────────────────────────────
const HOW_IT_WORKS_STEPS = [
  {
    num: '01',
    title: 'AI scans 3 platforms',
    desc: 'Every 2 hours Prescio scans Polymarket, Kalshi and Metaculus — filtering 500+ markets down to the ones worth watching.',
    illustration: (
      <div className="flex flex-col gap-2">
        {['POLYMARKET', 'KALSHI', 'METACULUS'].map((p) => (
          <div
            key={p}
            className="flex items-center gap-3 px-3 py-2 rounded-lg"
            style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}
          >
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'rgb(var(--accent))' }} />
            <span className="font-mono text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{p}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '02',
    title: 'Cross-references primary sources',
    desc: 'ISW, AP, BBC, official government briefings. Not Twitter. Not Reddit. The signal, not the noise.',
    illustration: (
      <div className="flex flex-col gap-2">
        {['ISW', 'AP Wire', 'BBC'].map((s) => (
          <div
            key={s}
            className="flex items-center gap-3 px-3 py-2 rounded-lg"
            style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}
          >
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--watch))' }} />
            <span className="font-mono text-xs font-bold" style={{ color: 'rgb(var(--text-secondary))' }}>{s}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '03',
    title: 'Free: track markets. Pro: trade with edge.',
    desc: 'Free users track markets live — price, volume, and resolution date. Pro users get AI edge analysis, fair value estimate, and Kelly-optimal position size.',
    illustration: (
      <div
        className="rounded-xl p-3"
        style={{ background: 'rgb(var(--bg-elevated))', border: '1px solid rgb(var(--bg-border))' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-lg text-accent bg-accent/10">ENTER</span>
          <span className="text-[9px] font-mono" style={{ color: 'rgb(var(--text-muted))' }}>+26pp edge</span>
        </div>
        <p className="font-mono text-xs font-bold text-text-primary mb-1 line-clamp-1">Will US enter Iran...</p>
        <p className="font-mono text-[10px]" style={{ color: 'rgb(var(--text-secondary))' }}>Bet 25% Kelly · 35% fair</p>
      </div>
    ),
  },
]

function HowItWorksSection({ sectionId }: { sectionId: string }) {
  const { ref, inView } = useInView(0.1)

  return (
    <section
      id={sectionId}
      style={{ padding: '120px 0', background: 'rgb(var(--bg-base))' }}
    >
      <div ref={ref} className="mx-auto" style={{ maxWidth: '1100px', padding: '0 clamp(16px, 4vw, 48px)' }}>
        {/* Header */}
        <div className="text-center mb-16" style={scrollFade(inView)}>
          <h2 className="font-mono font-bold text-text-primary mb-3" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>
            How it works
          </h2>
          <p className="font-mono" style={{ fontSize: '14px', color: 'rgb(var(--text-secondary))' }}>
            Three steps, every two hours.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex flex-col">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex gap-8"
              style={scrollFade(inView, 100 + i * 200)}
            >
              {/* Left: circle + connector line */}
              <div
                className="hidden md:flex flex-col items-center"
                style={{ width: '48px', flexShrink: 0 }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: '44px', height: '44px', flexShrink: 0,
                    background: 'rgb(var(--bg-base))',
                    border: '2px solid rgb(var(--accent))',
                    boxShadow: '0 0 14px 3px rgb(var(--accent) / 0.13)',
                  }}
                >
                  <span className="font-mono text-[11px] font-bold" style={{ color: 'rgb(var(--accent))' }}>{step.num}</span>
                </div>
                {i < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      width: '1px',
                      minHeight: '48px',
                      marginTop: '6px',
                      background: 'linear-gradient(to bottom, rgb(var(--accent) / 0.53), rgb(var(--accent) / 0.07))',
                    }}
                  />
                )}
              </div>

              {/* Right: content */}
              <div
                className="flex-1 grid grid-cols-1 gap-6"
                style={{
                  paddingBottom: i < HOW_IT_WORKS_STEPS.length - 1 ? '56px' : '0',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                }}
              >
                <div>
                  <span className="font-mono text-xs font-bold" style={{ color: 'rgb(var(--accent) / 0.4)' }}>{step.num}</span>
                  <h3
                    className="font-mono font-bold text-text-primary mt-1 mb-3"
                    style={{ fontSize: '18px', lineHeight: 1.3 }}
                  >
                    {step.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgb(var(--text-secondary))', lineHeight: 1.75 }}>{step.desc}</p>
                </div>
                <div className="hidden md:block" style={{ maxWidth: '200px' }}>
                  {step.illustration}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section 4 — Why Prescio ───────────────────────────────────────────────────
const WHY_CARDS = [
  {
    icon: (
      <svg className="text-accent" width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="3" width="15" height="19" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M8 8h7M8 11h7M8 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="20" cy="20" r="5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M23.5 23.5L26 26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Resolution arbitrage',
    desc: 'We read the fine print. Most traders don\'t. When the crowd prices "war with Iran" but the resolution requires boots on the ground — that\'s your edge.',
    badge: 'EXCLUSIVE',
    featured: false,
  },
  {
    icon: (
      <svg className="text-accent" width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4v3M14 21v3M4 14H7M21 14h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M7.5 7.5l2 2M18.5 18.5l2 2M7.5 20.5l2-2M18.5 9.5l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Primary sources only',
    desc: 'ISW daily updates. AP wire. Official government briefings. No aggregators, no pundits. The same sources professionals use.',
    badge: null,
    featured: true,
    sub: 'ISW · AP · BBC',
  },
  {
    icon: (
      <svg className="text-accent" width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="8" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        <path d="M9 14h10M9 17.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 8V6a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Mathematically optimal sizing',
    desc: 'Quarter Kelly by default. Half Kelly when you have track record. Never guessing, never overbet. Position size that survives variance.',
    badge: null,
    featured: false,
    formula: 'f* = (bp − q) / b',
  },
]

function WhyPrescioSection() {
  const { ref, inView } = useInView(0.1)
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <section style={{ padding: '120px 0' }}>
      <div ref={ref} className="mx-auto" style={{ maxWidth: '1100px', padding: '0 clamp(16px, 4vw, 48px)' }}>
        <div className="text-center mb-14" style={scrollFade(inView)}>
          <h2 className="font-mono font-bold text-text-primary mb-3" style={{ fontSize: 'clamp(22px, 3vw, 32px)' }}>
            Built different
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {WHY_CARDS.map((card, i) => (
            <div
              key={i}
              style={{
                ...scrollFade(inView, i * 100),
                background: 'rgb(var(--bg-surface))',
                border: `1px solid ${hovered === i ? 'rgb(var(--accent))' : card.featured ? 'rgb(var(--accent) / 0.2)' : 'rgb(var(--bg-border))'}`,
                borderRadius: '12px',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '320px',
                cursor: 'default',
                boxShadow: hovered === i ? '0 0 20px 2px rgb(var(--accent) / 0.07)' : card.featured ? '0 0 0 0 transparent' : 'none',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="mb-5">{card.icon}</div>
              <h3
                className="font-mono font-bold text-text-primary mb-3"
                style={{ fontSize: '15px', letterSpacing: '-0.01em' }}
              >
                {card.title}
              </h3>
              <p className="flex-1" style={{ fontSize: '13px', color: 'rgb(var(--text-secondary))', lineHeight: 1.7 }}>
                {card.desc}
              </p>
              <div className="mt-5">
                {card.badge && (
                  <span
                    className="font-mono text-[10px] font-bold px-2 py-1 rounded-lg"
                    style={{ color: 'rgb(var(--accent))', background: 'rgb(var(--accent) / 0.06)', border: '1px solid rgb(var(--accent) / 0.13)' }}
                  >
                    {card.badge}
                  </span>
                )}
                {'sub' in card && card.sub && (
                  <p className="font-mono text-[10px]" style={{ color: 'rgb(var(--text-muted))' }}>{card.sub}</p>
                )}
                {'formula' in card && card.formula && (
                  <p
                    className="font-mono text-sm"
                    style={{ color: 'rgb(var(--accent) / 0.4)', letterSpacing: '0.05em' }}
                  >
                    {card.formula}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Section 5 — Final CTA ─────────────────────────────────────────────────────
function CtaSection({ onSignup }: { onSignup: () => void }) {
  const { ref, inView } = useInView(0.2)
  const nextScan = useNextScanMins()

  return (
    <section
      style={{
        padding: '120px 0',
        background: 'radial-gradient(ellipse 60% 40% at 50% 50%, rgb(var(--accent) / 0.03), transparent)',
        borderTop: '1px solid rgb(var(--bg-border))',
      }}
    >
      <div ref={ref} className="mx-auto text-center" style={{ maxWidth: '600px', padding: '0 clamp(16px, 4vw, 48px)' }}>
        {/* Live counter */}
        <div
          className="inline-flex items-center gap-2 mb-8"
          style={scrollFade(inView)}
        >
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'rgb(var(--accent))' }} />
          <span className="font-mono text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
            247 analyses run today
          </span>
        </div>

        {/* Headline */}
        <h2
          className="font-mono font-bold mb-4"
          style={{ ...scrollFade(inView, 100), fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1.1, color: 'rgb(var(--text-primary))' }}
        >
          Stop guessing.<br />
          <span style={{ color: 'rgb(var(--accent))' }}>Start seeing.</span>
        </h2>

        <p
          className="font-mono mb-10"
          style={{ ...scrollFade(inView, 200), fontSize: '14px', color: 'rgb(var(--text-secondary))' }}
        >
          3 free analyses per day. No credit card required.
        </p>

        {/* CTA button */}
        <div style={scrollFade(inView, 300)}>
          <button
            onClick={onSignup}
            className="font-mono font-bold"
            style={{
              background: 'rgb(var(--accent))',
              color: 'rgb(var(--bg-base))',
              border: 'none',
              borderRadius: '8px',
              padding: '14px 36px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'transform 200ms ease, opacity 200ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.02)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          >
            Get started for free →
          </button>
        </div>

        {/* Countdown */}
        <p
          className="font-mono mt-6"
          style={{ ...scrollFade(inView, 400), fontSize: '12px', color: 'rgb(var(--text-muted))' }}
        >
          Next scan in ~{nextScan} minutes
        </p>
      </div>
    </section>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuthContext()
  const { theme, setTheme } = useTheme()

  if (!loading && user) {
    if (!profile) return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--bg-base))' }}>
        <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
      </div>
    )
    return <Navigate to={profile.onboarding_done ? '/markets' : '/onboarding'} replace />
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--bg-base))' }}>
        <span className="text-text-muted font-mono text-sm animate-pulse">LOADING...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-text-primary bg-bg-base">

      {/* ── NAVBAR ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-8 border-b border-bg-border bg-bg-base/95 backdrop-blur-md"
      >
        <div className="flex items-center justify-between w-full">
          <Logo size={24} textSize={14} />
          <div className="flex items-center gap-3">
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="hidden sm:block text-xs font-mono text-text-muted hover:text-text-secondary transition-colors"
            >
              How it works
            </button>

            {/* Theme toggle */}
            <div
              className="flex items-center rounded-md p-0.5 gap-0.5"
              style={{
                background: 'rgb(var(--bg-elevated))',
                border: '1px solid rgb(var(--bg-border))',
              }}
            >
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  title={t === 'dark' ? 'Dark mode' : 'Light mode'}
                  className="w-6 h-6 flex items-center justify-center rounded transition-all duration-150"
                  style={{
                    background: theme === t ? 'rgb(var(--bg-border))' : 'transparent',
                    boxShadow: theme === t ? '0 1px 2px rgb(0 0 0 / 0.15)' : 'none',
                    color: 'rgb(var(--text-secondary))',
                  }}
                >
                  {t === 'dark' ? <IconMoon size={13} /> : <IconSun size={13} />}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate('/auth?mode=signin')}
              className="text-xs font-mono text-text-secondary hover:text-text-primary transition-colors
                border border-bg-border rounded px-3 py-1.5 hover:border-text-muted"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO — static split ── */}
      <div className="relative overflow-hidden" style={{ height: '100vh' }}>

        <style>{`
          @media (min-width: 768px) {
            .hero-left-panel {
              width: 40%;
              clip-path: polygon(0 0, 100% 0, 105% 100%, 0 100%);
            }
            .hero-right-panel { display: flex; }
          }
        `}</style>

        {/* LEFT PANEL — compact text, ≤40% on desktop */}
        <div
          className="hero-left-panel absolute left-0 top-0 h-full w-full flex flex-col justify-center"
          style={{ background: 'rgb(var(--bg-base))', paddingTop: '56px', zIndex: 1 }}
        >
          <div style={{ paddingLeft: 'clamp(24px, 8%, 8%)', paddingRight: 'clamp(16px, 5%, 5%)',  }}>
            {/* Hero logo block */}
            <div className="flex items-center gap-3 mb-8">
              <Logo size={40} showText={false} />
              <div>
                <div className="font-mono text-[20px] font-bold tracking-widest text-text-primary uppercase leading-none">
                  Prescio
                </div>
                <div className="font-mono text-[10px] text-text-muted tracking-[0.08em] mt-0.5 uppercase">
                  prediction intelligence
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20
              rounded-full px-3 py-1 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-mono text-accent tracking-wider">AI-POWERED EDGE DETECTION</span>
            </div>

            {/* Heading */}
            <h1
              className="font-mono font-bold text-text-primary leading-tight mb-4"
              style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.8rem)' }}
            >
              The market is wrong.<br />
              <span className="text-accent">Prescio shows you where.</span>
            </h1>

            {/* Description */}
            <p className="text-text-muted mb-6" style={{ fontSize: '14px', lineHeight: 1.7 }}>
              Track every prediction market across <span className="text-text-secondary">Polymarket, Kalshi and Metaculus</span>.
              Pro users get AI edge analysis —{' '}
              finding mispriced markets <span className="text-accent">before the crowd corrects them.</span>
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {['Resolution analysis', 'Kelly sizing', 'Primary sources only', '3 platforms'].map((f) => (
                <span key={f} className="text-[10px] font-mono text-text-muted border border-bg-border px-2 py-1 rounded-md">
                  {f}
                </span>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-row gap-3 items-center mb-4">
              <button
                onClick={() => navigate('/auth?mode=signup')}
                className="px-6 py-2.5 bg-accent text-bg-base text-sm font-mono font-bold rounded-lg
                  hover:bg-accent/90 transition-colors whitespace-nowrap"
              >
                Start for free →
              </button>
              <button
                onClick={() => navigate('/auth?mode=signin')}
                className="px-4 py-2.5 text-sm font-mono text-text-secondary border border-bg-border rounded-lg
                  hover:border-text-muted hover:text-text-primary transition-colors whitespace-nowrap"
              >
                Sign in
              </button>
            </div>
            <p className="text-[11px] font-mono text-text-muted">
              No credit card · 3 free analyses/day
            </p>
          </div>
        </div>

        {/* RIGHT PANEL — rich feed preview, 60% */}
        <div
          className="hero-right-panel absolute right-0 top-0 h-full hidden flex-col"
          style={{
            width: '60%',
            background: 'linear-gradient(135deg, rgb(var(--bg-base)) 0%, rgb(var(--accent) / 0.04) 60%, rgb(var(--bg-base)) 100%)',
            clipPath: 'polygon(0% 0, 100% 0, 100% 100%, 5% 100%)',
            zIndex: 2,
            paddingTop: '56px',
          }}
        >
          {/* Header bar */}
          <div
            className="flex items-center justify-between px-8 py-3 border-b"
            style={{ borderColor: 'rgb(var(--bg-border))' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-[11px] font-mono font-bold text-accent/80 tracking-widest uppercase">MARKETS</span>
              <span className="text-[10px] font-mono text-text-muted">· {MOCK_CARDS.length} live</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-text-muted">
              <span className="hidden lg:block">Polymarket · Kalshi · Metaculus</span>
              <span style={{ color: 'rgb(var(--text-muted))' }}>Updated 2 min ago</span>
            </div>
          </div>

          {/* Column headers */}
          <div
            className="flex items-center px-8 py-1.5 text-[9px] font-mono text-text-muted uppercase tracking-widest border-b"
            style={{ borderColor: 'rgb(var(--bg-surface))' }}
          >
            <span className="flex-1">Market</span>
            <span className="w-16 text-right hidden lg:block">Volume</span>
            <span className="w-14 text-right">Trend</span>
          </div>

          {/* Cards list — fills remaining space */}
          <div className="flex-1 flex flex-col px-8 py-3 gap-1.5 overflow-hidden">
            {MOCK_CARDS.map((card, i) => (
              <HeroCard key={i} card={card} index={i} />
            ))}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-between px-8 py-2.5 border-t text-[9px] font-mono text-text-muted"
            style={{ borderColor: 'rgb(var(--bg-surface))' }}
          >
            <span>Scan interval: ~2 hours</span>
            <span>Next scan in 48 min</span>
          </div>

          {/* Bottom gradient fade */}
          <div
            className="absolute bottom-10 left-0 right-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent, rgb(var(--bg-base) / 0.9))' }}
          />
        </div>

        {/* DIVIDER */}
        <div
          className="absolute top-0 hidden md:block pointer-events-none"
          style={{
            left: 'calc(40% - 0.5px)',
            width: '1px',
            height: '100%',
            zIndex: 10,
            background: 'linear-gradient(to bottom, transparent 0%, rgb(var(--accent) / 0.27) 20%, rgb(var(--accent)) 50%, rgb(var(--accent) / 0.27) 80%, transparent 100%)',
            boxShadow: '0 0 15px 3px rgb(var(--accent) / 0.2), 0 0 30px 8px rgb(var(--accent) / 0.07)',
          }}
        />
      </div>

      {/* ── BELOW FOLD ── */}
      <StatsSection />
      <EdgeDemoSection />
      <HowItWorksSection sectionId="how-it-works" />
      <WhyPrescioSection />
      <CtaSection onSignup={() => navigate('/auth?mode=signup')} />

      <AppFooter />

    </div>
  )
}
