'use client'
import React from 'react'
import { TennisCourtArt } from './artwork/TennisCourtArt'

export type Discipline =
  | 'football' | 'basketball' | 'tennis' | 'mma'
  | 'cs2' | 'dota2' | 'valorant'

// Exact accent colors from the project
export const ACCENT: Record<Discipline, string> = {
  football:   '#e8c032',
  basketball: '#e66414',
  tennis:     '#C8E63C',
  mma:        '#e02020',
  cs2:        '#e66414',
  dota2:      '#c0392b',
  valorant:   '#ff4655',
}

// ─── Per-discipline SVG artwork ───────────────────────────────────────────────
// viewBox 0 0 1440 900, artwork concentrated in top ~450px, fades below.

function FootballArt(_: { a: string }) {
  return (
    <image href="/football-background.svg" x="0" y="0" width="1440" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.65" />
  )
}

function BasketballArt({ a }: { a: string }) {
  const rim = '#c85010'
  const rimHi = '#e87030'
  return (
    <svg x="0" y="0" width="1440" height="900" viewBox="0 0 900 480" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="bb-floorGlow" cx="50%" cy="60%" r="55%">
          <stop offset="0%"  stopColor={rim} stopOpacity="0.22"/>
          <stop offset="60%" stopColor="#8b3a0a" stopOpacity="0.08"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0"/>
        </radialGradient>
        <linearGradient id="bb-backboard" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2a1a0a"/>
          <stop offset="100%" stopColor="#1a0e06"/>
        </linearGradient>
        <linearGradient id="bb-rimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={rim}/>
          <stop offset="50%" stopColor={rimHi}/>
          <stop offset="100%" stopColor={rim}/>
        </linearGradient>
        <linearGradient id="bb-poleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1a1208"/>
          <stop offset="50%" stopColor="#2e2010"/>
          <stop offset="100%" stopColor="#1a1208"/>
        </linearGradient>
        <filter id="bb-rimBlur">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="bb-courtClip">
          <polygon points="210,170 690,170 840,480 60,480"/>
        </clipPath>
      </defs>

      {/* Court surface — narrower trapezoid */}
      <polygon points="210,170 690,170 840,480 60,480" fill="#120b04"/>
      <g clipPath="url(#bb-courtClip)">
        {/* Parquet strips */}
        <line x1="0" y1="185" x2="900" y2="185" stroke="#1a1006" strokeWidth="1"/>
        <line x1="0" y1="200" x2="900" y2="200" stroke="#1a1006" strokeWidth="1"/>
        <line x1="0" y1="215" x2="900" y2="215" stroke="#1a1006" strokeWidth="1"/>
        <line x1="0" y1="230" x2="900" y2="230" stroke="#1a1006" strokeWidth="1"/>
        <line x1="0" y1="248" x2="900" y2="248" stroke="#1a1006" strokeWidth="1.2"/>
        <line x1="0" y1="268" x2="900" y2="268" stroke="#1a1006" strokeWidth="1.2"/>
        <line x1="0" y1="290" x2="900" y2="290" stroke="#1a1006" strokeWidth="1.4"/>
        <line x1="0" y1="315" x2="900" y2="315" stroke="#1a1006" strokeWidth="1.4"/>
        <line x1="0" y1="345" x2="900" y2="345" stroke="#1a1006" strokeWidth="1.6"/>
        <line x1="0" y1="380" x2="900" y2="380" stroke="#1a1006" strokeWidth="1.6"/>
        <line x1="0" y1="422" x2="900" y2="422" stroke="#1a1006" strokeWidth="1.8"/>
        <polygon points="210,170 690,170 840,480 60,480" fill="url(#bb-floorGlow)"/>
        {/* Court markings */}
        <ellipse cx="450" cy="370" rx="140" ry="44" fill="none" stroke={rim} strokeWidth="1.2" strokeOpacity="0.5"/>
        <ellipse cx="450" cy="370" rx="52" ry="16" fill="none" stroke={rim} strokeWidth="0.8" strokeOpacity="0.4"/>
        <circle cx="450" cy="370" r="4" fill={rim} fillOpacity="0.5"/>
        <line x1="150" y1="370" x2="750" y2="370" stroke={rim} strokeWidth="0.8" strokeOpacity="0.35"/>
        <path d="M 210,480 Q 450,255 690,480" fill="none" stroke={rim} strokeWidth="1.4" strokeOpacity="0.55"/>
        <polygon points="330,170 570,170 620,370 280,370" fill="#0f0802" stroke={rim} strokeWidth="0.9" strokeOpacity="0.4"/>
        <line x1="280" y1="370" x2="620" y2="370" stroke={rim} strokeWidth="1" strokeOpacity="0.5"/>
        <path d="M 280,370 Q 450,315 620,370" fill="none" stroke={rim} strokeWidth="0.9" strokeOpacity="0.4"/>
        <polygon points="370,170 530,170 565,300 335,300" fill="none" stroke={rim} strokeWidth="0.7" strokeOpacity="0.3"/>
      </g>
      {/* Sidelines */}
      <line x1="210" y1="170" x2="60" y2="480" stroke={rim} strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="690" y1="170" x2="840" y2="480" stroke={rim} strokeWidth="1" strokeOpacity="0.4"/>
      <line x1="210" y1="170" x2="690" y2="170" stroke={rim} strokeWidth="1" strokeOpacity="0.4"/>
      {/* Pole — center x=450 */}
      <rect x="440" y="50" width="20" height="130" fill="url(#bb-poleGrad)" rx="2"/>
      {/* Backboard — centered on pole */}
      <rect x="410" y="55" width="80" height="56" rx="3" fill="url(#bb-backboard)" stroke="#2e2010" strokeWidth="1.5"/>
      <rect x="418" y="75" width="64" height="28" rx="1" fill="none" stroke={rim} strokeWidth="1.2" strokeOpacity="0.6"/>
      <rect x="410" y="55" width="80" height="8" rx="3" fill="#2a1a0a"/>
      {/* Rim — centered on pole (cx=450) */}
      <ellipse cx="450" cy="120" rx="28" ry="8" fill={rim} fillOpacity="0.15" filter="url(#bb-rimBlur)"/>
      <ellipse cx="450" cy="112" rx="26" ry="7" fill="none" stroke="url(#bb-rimGrad)" strokeWidth="4"/>
      <path d="M 424,112 Q 450,122 476,112" fill="none" stroke={rimHi} strokeWidth="4.5"/>
      {/* Net */}
      <line x1="432" y1="112" x2="427" y2="148" stroke={rim} strokeWidth="0.9" strokeOpacity="0.55"/>
      <line x1="439" y1="114" x2="436" y2="152" stroke={rim} strokeWidth="0.9" strokeOpacity="0.5"/>
      <line x1="446" y1="116" x2="444" y2="155" stroke={rim} strokeWidth="0.9" strokeOpacity="0.5"/>
      <line x1="454" y1="116" x2="453" y2="155" stroke={rim} strokeWidth="0.9" strokeOpacity="0.5"/>
      <line x1="461" y1="115" x2="461" y2="153" stroke={rim} strokeWidth="0.9" strokeOpacity="0.5"/>
      <line x1="468" y1="113" x2="470" y2="149" stroke={rim} strokeWidth="0.9" strokeOpacity="0.55"/>
      <path d="M 430,122 Q 450,126 471,122" fill="none" stroke={rim} strokeWidth="0.7" strokeOpacity="0.4"/>
      <path d="M 429,132 Q 450,137 472,132" fill="none" stroke={rim} strokeWidth="0.7" strokeOpacity="0.35"/>
      <path d="M 429,142 Q 450,148 472,142" fill="none" stroke={rim} strokeWidth="0.7" strokeOpacity="0.28"/>
      <path d="M 427,148 Q 450,158 474,148" fill="none" stroke={rim} strokeWidth="0.6" strokeOpacity="0.22"/>
      {/* Spotlight */}
      <circle cx="450" cy="8" r="5" fill="#fff8e0" fillOpacity="0.6"/>
      <circle cx="450" cy="8" r="10" fill="#ffe090" fillOpacity="0.1"/>
      <polygon points="440,8 460,8 560,170 340,170" fill={rimHi} fillOpacity="0.04"/>
      <polygon points="445,8 455,8 510,170 390,170" fill={rimHi} fillOpacity="0.05"/>
    </svg>
  )
}

function MMAArt(_: { a: string }) {
  return (
    <image href="/mma-background.svg" x="0" y="0" width="1440" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.65" />
  )
}

function CS2Art(_: { a: string }) {
  return (
    <image href="/cs2-background.svg" x="0" y="0" width="1440" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.65" />
  )
}

function Dota2Art(_: { a: string }) {
  return (
    <image href="/dota2-background.svg" x="0" y="0" width="1440" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.65" />
  )
}

function ValorantArt({ a }: { a: string }) {
  return (
    <>
      {/* V-spike from top center */}
      <polygon points="720,0 630,294 810,294" fill={a} fillOpacity="0.04" />
      <line x1="720" y1="0" x2="630" y2="294" stroke={a} strokeOpacity="0.12" strokeWidth="0.6" />
      <line x1="720" y1="0" x2="810" y2="294" stroke={a} strokeOpacity="0.12" strokeWidth="0.6" />
      <circle cx="720" cy="2" r="5"  fill={a} fillOpacity="0.55" />
      <circle cx="720" cy="2" r="11" fill={a} fillOpacity="0.10" />
      {/* Valorant V outline */}
      <path d="M 600 22 L 720 152 L 840 22" stroke={a} strokeOpacity="0.10" strokeWidth="1.0" fill="none" />
      <path d="M 650 22 L 720 112 L 790 22" stroke={a} strokeOpacity="0.07" strokeWidth="0.6" fill="none" />
      {/* Target sight */}
      <circle cx="956" cy="222" r="36" stroke={a} strokeOpacity="0.10" strokeWidth="0.7" fill="none" />
      <circle cx="956" cy="222" r="14" stroke={a} strokeOpacity="0.08" strokeWidth="0.5" fill="none" />
      <line x1="914" y1="222" x2="998" y2="222" stroke={a} strokeOpacity="0.12" strokeWidth="0.7" />
      <line x1="956" y1="180" x2="956" y2="264" stroke={a} strokeOpacity="0.12" strokeWidth="0.7" />
      {/* Corner frames */}
      <path d="M 196 72  L 218 72  L 218 50"  stroke={a} strokeOpacity="0.14" strokeWidth="0.8" fill="none" />
      <path d="M 196 190 L 218 190 L 218 212" stroke={a} strokeOpacity="0.14" strokeWidth="0.8" fill="none" />
      <path d="M 1222 72  L 1244 72  L 1244 50"  stroke={a} strokeOpacity="0.14" strokeWidth="0.8" fill="none" />
      <path d="M 1222 190 L 1244 190 L 1244 212" stroke={a} strokeOpacity="0.14" strokeWidth="0.8" fill="none" />
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function WorldBackground({ discipline }: { discipline: Discipline }) {
  const a = ACCENT[discipline]
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      pointerEvents: 'none', overflow: 'hidden',
    }}>
      {/* Ambient top glow */}
      <div style={{
        position: 'absolute', top: -60, left: '50%',
        transform: 'translateX(-50%)',
        width: 960, height: 620,
        background: `radial-gradient(ellipse 68% 58% at 50% 18%, ${a}1c 0%, ${a}09 44%, transparent 70%)`,
      }} />

      {/* SVG artwork */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        {discipline === 'football'   && <FootballArt   a={a} />}
        {discipline === 'basketball' && <BasketballArt a={a} />}
        {discipline === 'tennis'     && <TennisCourtArt a={a} />}
        {discipline === 'mma'        && <MMAArt        a={a} />}
        {discipline === 'cs2'        && <CS2Art        a={a} />}
        {discipline === 'dota2'      && <Dota2Art      a={a} />}
        {discipline === 'valorant'   && <ValorantArt   a={a} />}
      </svg>

    </div>
  )
}
