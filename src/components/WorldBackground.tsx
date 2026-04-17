'use client'
import React from 'react'
import { TennisCourtArt } from './artwork/TennisCourtArt'
import { ACCENT, mix, type Discipline } from './disciplines'

export { ACCENT, type Discipline }

// ─── Per-discipline SVG artwork ───────────────────────────────────────────────
// viewBox 0 0 1440 900, artwork concentrated in top ~450px, fades below.

function FootballArt(_: { a: string }) {
  return (
    <>
      {/* Dark — original SVG (visible in dark theme via CSS toggle) */}
      <g className="football-art-dark">
        <image href="/football-background.svg" x="0" y="0" width="1440" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.65" />
      </g>

      {/* Light — perspective stadium mirroring dark SVG geometry exactly.
          Nested viewBox 680x430 matches /football-background.svg, so every
          coordinate (stands, spotlights, field, markings) lines up 1:1 with
          the dark variant — only the palette swaps to warm cream + dark amber. */}
      <g className="football-art-light">
        <svg x="0" y="0" width="1440" height="900" viewBox="0 0 680 430" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="fLightStad" cx="50%" cy="0%" r="75%">
              <stop offset="0%"   stopColor="#f6ecce"/>
              <stop offset="45%"  stopColor="#f0e3bf"/>
              <stop offset="100%" stopColor="#e8dcab"/>
            </radialGradient>
            <radialGradient id="fLightFglow" cx="340" cy="295" r="260" gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor="#8B6914" stopOpacity="0.10"/>
              <stop offset="100%" stopColor="#8B6914" stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="fLightSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#f8f1d8"/>
              <stop offset="100%" stopColor="#f8f1d8" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="fLightBot" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#f4ebd5" stopOpacity="0"/>
              <stop offset="100%" stopColor="#f4ebd5" stopOpacity="0.7"/>
            </linearGradient>
          </defs>

          {/* Sky base */}
          <rect width="680" height="420" fill="#f4ebd5"/>
          <rect width="680" height="420" fill="url(#fLightStad)"/>

          {/* Spotlight cones */}
          <polygon points="166,4 178,4 400,178 -60,178" fill="rgba(139,105,20,0.05)"/>
          <polygon points="168,4 176,4 290,178 70,178"  fill="rgba(139,105,20,0.07)"/>
          <polygon points="502,4 514,4 740,178 280,178" fill="rgba(139,105,20,0.05)"/>
          <polygon points="504,4 512,4 610,178 390,178" fill="rgba(139,105,20,0.07)"/>
          <circle cx="172" cy="5" r="5"  fill="rgba(139,105,20,0.85)"/>
          <circle cx="172" cy="5" r="14" fill="rgba(139,105,20,0.16)"/>
          <circle cx="508" cy="5" r="5"  fill="rgba(139,105,20,0.85)"/>
          <circle cx="508" cy="5" r="14" fill="rgba(139,105,20,0.16)"/>

          {/* Field base */}
          <polygon points="200,178 480,178 630,415 50,415" fill="#ead8a8"/>

          {/* Field stripes — perspective trapezoids alternating cream/lighter */}
          <polygon points="200,178 480,178 491,196 189,196" fill="#f0e0b4"/>
          <polygon points="189,196 491,196 504,217 176,217" fill="#ead8a8"/>
          <polygon points="176,217 504,217 520,241 160,241" fill="#f0e0b4"/>
          <polygon points="160,241 520,241 539,271 141,271" fill="#ead8a8"/>
          <polygon points="141,271 539,271 562,308 118,308" fill="#f0e0b4"/>
          <polygon points="118,308 562,308 591,355 89,355"  fill="#ead8a8"/>
          <polygon points="89,355 591,355 630,415 50,415"   fill="#f0e0b4"/>

          {/* Field glow */}
          <polygon points="200,178 480,178 630,415 50,415" fill="url(#fLightFglow)"/>

          {/* ======= FIELD MARKINGS (dark amber) ======= */}
          {/* Outer boundary */}
          <polygon points="200,178 480,178 630,415 50,415" fill="none" stroke="rgba(139,105,20,0.85)" strokeWidth="1.5"/>
          {/* Halfway line */}
          <line x1="151" y1="255" x2="529" y2="255" stroke="rgba(139,105,20,0.78)" strokeWidth="1.3"/>
          {/* Center circle */}
          <ellipse cx="340" cy="255" rx="51" ry="18" fill="none" stroke="rgba(139,105,20,0.72)" strokeWidth="1.3"/>
          {/* Center spot */}
          <circle cx="340" cy="255" r="3.5" fill="rgba(139,105,20,0.92)"/>

          {/* FAR end */}
          <polygon points="257,178 423,178 430,198 250,198" fill="none" stroke="rgba(139,105,20,0.55)" strokeWidth="1.1"/>
          <polygon points="302,178 378,178 379,184 301,184" fill="none" stroke="rgba(139,105,20,0.45)" strokeWidth="0.9"/>
          <circle cx="340" cy="191" r="2" fill="rgba(139,105,20,0.6)"/>
          <path d="M 307 198 A 40 11 0 0 1 373 198" fill="none" stroke="rgba(139,105,20,0.5)" strokeWidth="1.0"/>

          {/* NEAR end */}
          <polygon points="193,349 487,349 512,415 168,415" fill="none" stroke="rgba(139,105,20,0.85)" strokeWidth="1.4"/>
          <polygon points="266,391 414,391 418,415 262,415" fill="none" stroke="rgba(139,105,20,0.78)" strokeWidth="1.2"/>
          <circle cx="340" cy="369" r="3.5" fill="rgba(139,105,20,0.9)"/>
          <path d="M 287 349 A 70 35 0 0 0 393 349" fill="none" stroke="rgba(139,105,20,0.78)" strokeWidth="1.3"/>

          {/* Corner arcs */}
          <path d="M 58 415 A 8.5 4.7 0 0 0 50 410"  fill="none" stroke="rgba(139,105,20,0.78)" strokeWidth="1.2"/>
          <path d="M 622 415 A 8.5 4.7 0 0 1 630 410" fill="none" stroke="rgba(139,105,20,0.78)" strokeWidth="1.2"/>
          <path d="M 204 178 A 4.1 1.1 0 0 1 200 179" fill="none" stroke="rgba(139,105,20,0.55)" strokeWidth="1.0"/>
          <path d="M 476 178 A 4.1 1.1 0 0 0 480 179" fill="none" stroke="rgba(139,105,20,0.55)" strokeWidth="1.0"/>

          {/* Fades */}
          <rect x="0" y="360" width="680" height="60" fill="url(#fLightBot)"/>
          <rect width="680" height="96" fill="url(#fLightSky)"/>
        </svg>
      </g>
    </>
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
        <linearGradient id="bb-rimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={rim}/>
          <stop offset="50%" stopColor={rimHi}/>
          <stop offset="100%" stopColor={rim}/>
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
      {/* Pole */}
      <rect x="440" y="50" width="20" height="130" fill="#1a1208" rx="2"/>
      {/* Backboard */}
      <rect x="410" y="55" width="80" height="56" rx="3" fill="#1a0e06" stroke="#2e2010" strokeWidth="1.5"/>
      <rect x="418" y="75" width="64" height="28" rx="1" fill="none" stroke={rim} strokeWidth="1.2" strokeOpacity="0.6"/>
      <rect x="410" y="55" width="80" height="8" rx="3" fill="#2a1a0a"/>
      {/* Rim */}
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
    <>
      {/* Dark — original SVG art (visible in dark theme via CSS toggle) */}
      <g className="cs2-art-dark">
        <image href="/cs2-background.svg" x="0" y="0" width="1440" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.65" />
      </g>

      {/* Light — hand-built tactical SVG: centered CS2 logo + scan lines + L-corners + crosshair */}
      <g className="cs2-art-light">
        {/* Vertical tactical scan lines on the right */}
        <line x1="1080" y1="-30" x2="1080" y2="930" stroke="rgba(160,66,12,0.06)" strokeWidth="0.8"/>
        <line x1="1180" y1="-30" x2="1180" y2="930" stroke="rgba(160,66,12,0.04)" strokeWidth="0.6"/>
        <line x1="260"  y1="-30" x2="260"  y2="930" stroke="rgba(160,66,12,0.05)" strokeWidth="0.6"/>

        {/* Big CS2 logo, centered like the dark-theme background.
            Dark bg uses translate(228,118) scale(9.33) in 680x485 viewBox; rendered into
            1440x900 with xMidYMid slice → effective scale 9.33*2.118=19.76 and
            translate (483, 186) so logo center lands at (720, 423). LogoCS2 native viewBox 0..24. */}
        <g transform="translate(483 186) scale(19.76)" opacity="0.16" fill="#a0420c">
          <path d="M9.103.435c.4347-.3913 1.087-.5362 1.6522-.3623.2174.0725.4058.203.6087.3333.1595.1015.3479.145.4928.261.0725.058.0145.1594.0145.2318.1884.4493.2899.9421.1305 1.4204-.1305.1594-.3624.203-.5508.2754-.029.2029.0435.3913.0725.5942-.0435.029-.0725.058-.116.087.2754-.0145.5508-.0725.8262-.1304.1014-.1015.2608-.0435.3913-.058.0145-.203.087-.3914.087-.5943.029 0 .087-.0145.1159-.029.0145.145 0 .29.0435.4349.0724.058.1884.029.2754.0434 0 .058 0 .116.0144.174 1.6813-.0145 3.377 0 5.0583 0v.2464h.1595v-.9421h.1884c0 .2609-.0145.5072 0 .7681a.1107.1107 0 0 0 .0725.029c0 .029.0144.087.0144.116.058-.058.1305-.1015.2174-.0725.0145.0435.029.087.0435.145-.058.058-.087.1304-.058.2173.4639.0145.9277 0 1.406 0 .0434-.058.1159-.087.1884-.116.029.0146.0724.0436.087.058h.6811c.029.116.029.232.0145.3334h-.6957c-.0145.0145-.058.058-.087.0725-.0724-.0435-.1304-.0725-.2029-.116h-1.2609c-.2464.0725-.5073.058-.7537.0145v.2754h-2.0726c-.087.0725-.1739.116-.2898.1305.0434.2174-.203.2753-.29.4348-.0579.087-.1448.1449-.2318.1739-.0725.4493.087.8696.203 1.29-.1305.029-.2755.0724-.406.1014-.0724.2899-.1449.5942-.2028.884-.058.261-.261.4784-.5073.5798-.174.203-.4058.4059-.6812.4204-.1015.029-.174-.0435-.2464-.1015-.3623.029-.6957-.145-1.0146-.2899-.3478-.1594-.6667-.3623-1-.5507.029.2029-.0725.3768-.145.5507.1595.0725.3769.1305.4638.3044.058.1304.116.2754.116.4348-.0145.5218-.0725 1.0435-.1015 1.5653.0145.3769-.1739.7537-.4348 1.029-.1739-.0144-.3188-.0869-.4783-.1594-.058.1305-.1884.261-.116.4204.058.1884.058.3913.145.5652.4928.5218.9131 1.1015 1.2175 1.7537.3043.6233.5362 1.2755.7826 1.9277.0435 0 .1305-.0145.174-.0145.058.1884 0 .4058.116.5798.1014.1594.0724.3478.0724.5362-.029.4348-.058.8696-.1015 1.3044-.029.3044-.1014.6088-.1449.9132.0145.2318.116.4637.1014.6956-.0144.2175-.0144.4493-.1884.6088.0145.4928-.116.9855.058 1.4638.232.3189.4928.6233.7682.8986.3043.145.6667.174.9276.4349.1014.1594.0434.3478.0145.5217a6.7323 6.7323 0 0 1-1.8697 0c-.2464-.058-.4783-.1594-.7247-.1884-.3334.0145-.7247.145-1.029-.087-.029-.3913.1159-.7681.1884-1.145.029-.1304.1594-.2174.1449-.3478-.029-.4493-.058-.9131-.087-1.3624-.058-.029-.1594-.058-.1449-.145 0-.2173-.0725-.4347-.1304-.6377-.1015-.5507-.145-1.116-.1595-1.6812-.0145-.1595.087-.2754.203-.3769.029-.2464.058-.5072.0724-.7536-.0435-.1305-.145-.232-.203-.3479-.2608.029-.6376.087-.797-.1884-.3769-.5653-.7682-1.145-1.145-1.7102-.1595-.0145-.3479 0-.4928-.1015-.1595-.174-.261-.4058-.3624-.6232-.0435.1739-.0725.3623-.174.5072-.0869.145-.2318.2464-.3333.3769-.1014.2319-.1884.4638-.2753.6957-.1015.2898-.2464.5797-.2754.8986-.0145.1594-.0435.3044-.1015.4493-.0724.116-.2029.1594-.3188.2174-.087.1884-.145.3768-.2754.5363-.087.1014-.232.1304-.2899.2608-.058.174-.145.3334-.2174.4928-.029.174.087.3624.029.5363-.1015.4348-.3189.8406-.5218 1.232-.1014.2898-.1739.5942-.3188.8696-.058.116-.203.145-.3189.1594-.1304.3189-.2754.6232-.3623.9566-.0435.3188-.0435.6522-.029.971 0 .145.087.261.145.3914.0579.174.0144.3478-.0146.5218-.5652.0724-1.145.1304-1.6957-.0435-.058-.0435-.0435-.116-.058-.174-.0435-.2608-.0725-.5362.0145-.7826.1884-.6812.3478-1.3624.5362-2.0436-.0724-.0725-.1739-.1304-.1739-.2464-.0145-.1884 0-.3913.0435-.5797.087-.319.3189-.5653.4348-.8697.0435-.1304.029-.2609.0435-.3913 0-.3044.174-.5508.3044-.8116.1304-.2174.2318-.4493.4058-.6378.116-.1014.116-.2608.2029-.3913.087-.1594.2319-.2899.2319-.4783.029-.2319-.058-.4638-.029-.6957.058-.6812.1884-1.3479.3044-2.029-.058-.0726-.145-.145-.174-.2465.0145-.0724.029-.1304.0435-.2029l-.1304-.2174c.058-.087.116-.1884.174-.2754-.058-.0435-.1305-.1014-.1885-.145.0725-.2173.0435-.5362.3043-.6376.029.0145.1015.029.1305.0434-.0435-.3768-.0435-.7681-.087-1.145-.1014-.4058-.116-.826-.0724-1.232.1449-.2173.4203-.3043.6667-.3188-.3189-.0724-.6378-.1014-.9421-.2029-.0145-.2609.029-.5218.0725-.7826.1304-.5073.0724-1.029.1449-1.5509.0725-.1449.2609-.1739.4203-.1449.1884.029.3768-.029.5653-.087 0-.0724.0145-.1594 0-.2319-.116-.5072-.087-1.029 0-1.5218.116-.6377.3768-1.261.855-1.7102.319-.3044.7827-.4494 1.2176-.4349.1449 0 .2318.145.3478.232.058-.058.116-.116.1594-.174-.0724-.2464-.1884-.5073-.1739-.7681.029-.5798.2174-1.174.6522-1.5654m4.522 4.1017c.029.029.029.029 0 0m.203.029c.0144.1015.0434.203-.0145.2899-.0725.029-.1595.029-.232.0725.203 0 .4059.0145.6088 0 .1594-.0435.1015-.2464.1015-.3624-.1015-.116-.3189-.0435-.4638 0m-.5073.6088c.145.1594.2174.4058.3478.5652.1884-.2464.3334-.5073.5508-.7247-.2609-.0145-.5218.0145-.7827-.0145-.0435.058-.0724.116-.116.174Z"/>
        </g>

        {/* Distant crosshair target */}
        <g stroke="rgba(160,66,12,0.18)" strokeWidth="0.8" fill="none">
          <circle cx="280" cy="240" r="22"/>
          <circle cx="280" cy="240" r="8"/>
          <line x1="252" y1="240" x2="308" y2="240"/>
          <line x1="280" y1="212" x2="280" y2="268"/>
        </g>

        {/* Tactical L-corner marks */}
        <path d="M 70 70 L 100 70 L 100 100"     stroke="rgba(160,66,12,0.30)" strokeWidth="1" fill="none"/>
        <path d="M 1370 70 L 1340 70 L 1340 100"  stroke="rgba(160,66,12,0.30)" strokeWidth="1" fill="none"/>
        <path d="M 70 830 L 100 830 L 100 800"    stroke="rgba(160,66,12,0.30)" strokeWidth="1" fill="none"/>
        <path d="M 1370 830 L 1340 830 L 1340 800" stroke="rgba(160,66,12,0.30)" strokeWidth="1" fill="none"/>
      </g>
    </>
  )
}

function Dota2Art(_: { a: string }) {
  return (
    <>
      {/* Dark — original SVG art (visible in dark theme via CSS toggle) */}
      <g className="dota-art-dark">
        <image href="/dota2-background.svg" x="0" y="0" width="1440" height="900" preserveAspectRatio="xMidYMid slice" opacity="0.65" />
      </g>

      {/* Light — hand-built SVG: Dota logo crystal + mystic arcs + runes + L-corners */}
      <g className="dota-art-light">
        {/* Mystic arcs sweeping top-to-bottom on the right */}
        <path d="M 900 -90 Q 1080 450 900 990" stroke="rgba(180,110,30,0.10)" strokeWidth="1.2" fill="none"/>
        <path d="M 960 -120 Q 1175 450 960 1020" stroke="rgba(180,110,30,0.06)" strokeWidth="1" fill="none"/>
        <path d="M 840 -60 Q 1010 450 840 960" stroke="rgba(192,57,43,0.08)" strokeWidth="0.9" fill="none"/>
        <path d="M 1140 30 Q 1260 450 1140 870" stroke="rgba(180,110,30,0.10)" strokeWidth="0.8" fill="none"/>
        <path d="M 1224 0 Q 1380 450 1224 900" stroke="rgba(180,110,30,0.06)" strokeWidth="0.6" fill="none"/>

        {/* Big Dota 2 logo — identical placement/size to dark theme.
            Dark bg uses translate(270,140) scale(5.83) in its 680x480 viewBox; rendered
            into 1440x900 with xMidYMid slice → effective scale 5.83*2.118=12.35 and
            translate (572, 238) so logo center lands at (720, 386). */}
        <g transform="translate(572 238) scale(12.35)" opacity="0.16" fill="#8E2820">
          <path d="M9.817 23.607 9.471 23.313l-.468-.04c-.584-.048-.856-.101-1.186-.232l-.258-.103-.278.11c-.236.095-.814.181-1.253.188-.024 0-.064-.056-.089-.125-.028-.07-.077-.137-.115-.15-.035-.012-.297.046-.587.133l-.525.158-.189-.091c-.238-.116-.338-.114-.736.007-.303.094-.341.096-.584.044-.363-.076-.666-.071-1.349.026-.744.106-.76.106-.979-.044C1.728 23.094 1.648 23.069 1.469 23.069c-.203 0-.225-.009-.248-.104a.607.607 0 0 1 .043-.381c.112-.278.156-.952.168-2.563l.012-1.505.211.015.208.015.032-.87c.016-.478.032-1.169.035-1.534l.005-.66-.112-.08c-.305-.223-.291-.191-.418-.918-.066-.377-.131-.93-.146-1.23-.025-.532-.023-.547.075-.658l.1-.114.248.213c.138.117.255.194.266.17.036-.113-.077-1.461-.135-1.631-.038-.1-.066-.237-.066-.308 0-.068-.068-.252-.153-.412l-.151-.289.051-.513c.067-.68-.019-1.18-.304-1.782L.065 7.763l.079-.673.084-.674-.088-.349L.049 5.717l.105-.391.101-.393L.14 4.553.021 4.174l.143-.4C.305 3.385.308 3.364.305 2.73.303 2.016.228 1.551.08 1.365-.047 1.203-.026 1.092.163.919.253.834.328.726.328.681c0-.069.031-.082.221-.086.12 0 .49-.032.823-.07l.607-.073.794.117c.792.115.793.115 1.879.069l1.088-.047.257.155.26.153 1.055-.015 1.056-.015.356-.129c.194-.071.505-.195.69-.279.182-.084.513-.197.73-.257l.398-.105.514.162.514.164.444-.149.442-.149.477.158c.263.086.751.298 1.089.472l.611.312.64-.018c.485-.015.651-.033.677-.078.02-.031.081-.215.133-.407l.095-.351.605.02c.453.016.859.064 1.601.194l.995.176.259-.104c.14-.057.408-.126.595-.15.313-.042.367-.037.794.071.398.1.535.115 1.082.115.345 0 .703-.015.798-.031.163-.028.19-.017.521.222.193.138.364.273.379.302.017.027.053.173.077.324l.046.278-.209.396c-.117.218-.214.415-.214.438 0 .023.048.061.104.088.057.025.153.123.215.217l.111.17-.025 2.285c-.015 1.257-.04 2.378-.054 2.489l-.027.204-.345-.022-.344-.027-.029.191c-.016.103-.029.292-.029.424 0 .192-.03.293-.16.546l-.163.311.09.129c.05.072.221.265.38.43l.292.305-.089.323-.09.325.107.688c.124.827.115 1.035-.088 1.751-.081.287-.146.553-.146.593 0 .075.055.094.427.145.165.021.2.041.2.116 0 .049.026 1.104.06 2.345.107 4.075.117 4.964.067 5.888-.027.482-.058.882-.067.891-.01.009-.341-.124-.738-.295l-.723-.308-.312.135c-.322.139-.354.175-.396.442-.029.177-.007.169-.8.331l-.467.096-.454-.152c-.42-.141-.477-.151-.808-.129-.247.015-.417.003-.562-.04-.208-.059-.208-.059-.557.102l-.352.159H16.435c-1.369-.002-1.651.02-2.594.195-.652.12-.881.115-2.022-.022l-.602-.074-.421.096c-.234.054-.47.096-.526.094-.068 0-.224-.101-.451-.294ZM7.284 19.918c1.005-.379 1.834-.695 1.839-.702.013-.014-3.917-3.826-4.439-4.307-.145-.134-.275-.237-.285-.227-.009.011-.329.865-.709 1.895-.42 1.138-.679 1.899-.658 1.931.025.042 2.392 2.091 2.419 2.097.003 0 .828-.309 1.833-.687Zm13.512-2.089c.523-1.265.936-2.31.922-2.325-.019-.021-9.83-6.646-16.698-11.278l-.551-.371-.9.407c-.497.222-.896.425-.889.447.01.028 3.331 3.51 7.384 7.74l7.368 7.692 1.206-.008 1.209-.008.949-2.296Zm-1.362-10.857c.173-.962.316-1.781.316-1.821 0-.043-.253-.249-.676-.546-.372-.262-.701-.49-.73-.509-.053-.033-3.902 1.008-3.897 1.053.004.03 4.644 3.599 4.66 3.582.008-.006.154-.799.327-1.759Z"/>
        </g>

        {/* Scattered rune-diamonds */}
        <g fill="rgba(180,110,30,0.20)">
          <rect x="160"  y="240" width="6" height="6" transform="rotate(45 163 243)"/>
          <rect x="280"  y="540" width="5" height="5" transform="rotate(45 282 542)"/>
          <rect x="200"  y="430" width="4" height="4" transform="rotate(45 202 432)"/>
          <rect x="360"  y="700" width="5" height="5" transform="rotate(45 362 702)"/>
          <rect x="1280" y="540" width="5" height="5" transform="rotate(45 1282 542)"/>
          <rect x="1180" y="700" width="4" height="4" transform="rotate(45 1182 702)"/>
          <rect x="1340" y="320" width="4" height="4" transform="rotate(45 1342 322)"/>
        </g>

        {/* L-cornermarks */}
        <path d="M 70 70 L 100 70 L 100 100"     stroke="rgba(180,110,30,0.28)" strokeWidth="1" fill="none"/>
        <path d="M 1370 70 L 1340 70 L 1340 100"  stroke="rgba(180,110,30,0.28)" strokeWidth="1" fill="none"/>
        <path d="M 70 830 L 100 830 L 100 800"    stroke="rgba(180,110,30,0.28)" strokeWidth="1" fill="none"/>
        <path d="M 1370 830 L 1340 830 L 1340 800" stroke="rgba(180,110,30,0.28)" strokeWidth="1" fill="none"/>
      </g>
    </>
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
        background: `radial-gradient(ellipse 68% 58% at 50% 18%, ${mix(a, 11)} 0%, ${mix(a, 4)} 44%, transparent 70%)`,
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
