import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Prescio — AI Edge Detection for Prediction Markets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: '#080808',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'monospace',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 600,
            background: 'radial-gradient(ellipse 60% 50% at 50% 20%, rgba(0,255,136,0.12) 0%, transparent 70%)',
            display: 'flex',
          }}
        />

        {/* Eye icon */}
        <svg viewBox="0 0 100 100" width={120} height={120} style={{ marginBottom: 32 }}>
          <path d="M2,53 Q50,92 98,53" fill="none" stroke="#0c2e18" strokeWidth="15" strokeLinecap="round" />
          <path d="M6,50 Q50,22 94,50 Q50,67 6,50 Z" fill="#00ff88" />
          <polygon points="6,50 17,42 17,58" fill="#080808" />
          <polygon points="94,50 83,42 83,58" fill="#080808" />
          <circle cx="50" cy="50" r="21" fill="#080808" />
          <rect x="43" y="20" width="14" height="27" rx="7" fill="#00ff88" />
          <rect x="43" y="53" width="14" height="27" rx="7" fill="#00ff88" />
          <rect x="20" y="43" width="27" height="14" rx="7" fill="#00ff88" />
          <rect x="53" y="43" width="27" height="14" rx="7" fill="#00ff88" />
          <circle cx="50" cy="50" r="12" fill="#00ff88" />
        </svg>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
          <span style={{ fontSize: 80, fontWeight: 700, letterSpacing: '0.12em', color: '#ffffff', textTransform: 'uppercase' }}>
            PRESC
          </span>
          <span style={{ fontSize: 80, fontWeight: 700, letterSpacing: '0.12em', color: '#00ff88', textTransform: 'uppercase' }}>
            IO
          </span>
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          AI Edge Detection for Prediction Markets
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, transparent, #00ff88, transparent)',
            display: 'flex',
          }}
        />
      </div>
    ),
    { ...size },
  )
}
