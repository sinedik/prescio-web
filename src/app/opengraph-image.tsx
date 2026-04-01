import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Prescio — AI Edge Detection for Prediction Markets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ACCENT = '#00ff88'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#080808',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '72px 80px',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Accent glow top-right */}
        <div
          style={{
            position: 'absolute',
            top: '-160px',
            right: '-160px',
            width: '560px',
            height: '560px',
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(0,255,136,0.07) 0%, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* ── Logo row ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>

          {/* Eye-with-crosshair SVG — matches Logo.tsx exactly, scaled to 48px */}
          <svg
            viewBox="0 0 80 80"
            width={48}
            height={48}
            fill="none"
          >
            <path d="M10 40 Q40 10 70 40" stroke={ACCENT} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M10 40 Q40 70 70 40" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" opacity="0.5" />
            <circle cx="40" cy="40" r="11" stroke={ACCENT} strokeWidth="2" />
            <line x1="40" y1="25" x2="40" y2="31" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="40" y1="49" x2="40" y2="55" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="25" y1="40" x2="31" y2="40" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="49" y1="40" x2="55" y2="40" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="40" cy="40" r="4.5" fill={ACCENT} />
          </svg>

          {/* Wordmark: Presc white, io accent */}
          <div style={{ display: 'flex', alignItems: 'baseline' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>
              PRESC
            </span>
            <span style={{ fontSize: '32px', fontWeight: 700, color: ACCENT, letterSpacing: '0.06em' }}>
              IO
            </span>
          </div>

          {/* AI badge */}
          <div
            style={{
              display: 'flex',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(0,255,136,0.1)',
              border: `1px solid rgba(0,255,136,0.25)`,
              fontSize: '11px',
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: '0.1em',
            }}
          >
            AI
          </div>
        </div>

        {/* ── Headline ── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontSize: '54px',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
          }}
        >
          <span style={{ color: '#ffffff' }}>Markets are wrong.</span>
          <span style={{ color: ACCENT }}>Prescio shows you where.</span>
        </div>

        {/* ── Description ── */}
        <div
          style={{
            display: 'flex',
            fontSize: '20px',
            color: '#888888',
            lineHeight: 1.5,
            marginBottom: '48px',
            maxWidth: '760px',
          }}
        >
          AI edge detection across prediction markets, sports, esports &amp; crypto.
          Kalshi · Polymarket · Metaculus · Football · Dota 2 · CS2.
          Free to track — Pro to act.
        </div>

        {/* ── Pills ── */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Prediction Markets', 'Sports', 'Esports', 'Crypto'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '7px 16px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#aaaaaa',
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* ── Bottom bar ── */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '4px',
            background: `linear-gradient(to right, transparent, ${ACCENT}, transparent)`,
            display: 'flex',
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '22px',
            right: '80px',
            display: 'flex',
            alignItems: 'baseline',
            gap: '0px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#444444', letterSpacing: '0.05em' }}>presc</span>
          <span style={{ fontSize: '13px', color: `rgba(0,255,136,0.4)`, letterSpacing: '0.05em' }}>io.io</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
