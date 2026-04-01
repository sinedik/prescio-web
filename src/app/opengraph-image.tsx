import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Prescio — AI Edge Detection for Prediction Markets'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

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
        {/* Accent glow */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(0,255,136,0.12)',
              border: '1.5px solid rgba(0,255,136,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ width: '20px', height: '20px', background: '#00ff88', borderRadius: '4px' }} />
          </div>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
            PRESCIO
          </span>
          <div
            style={{
              marginLeft: '8px',
              padding: '4px 10px',
              borderRadius: '6px',
              background: 'rgba(0,255,136,0.1)',
              border: '1px solid rgba(0,255,136,0.25)',
              fontSize: '11px',
              fontWeight: 700,
              color: '#00ff88',
              letterSpacing: '0.1em',
            }}
          >
            AI
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '56px',
            fontWeight: 800,
            color: '#ffffff',
            lineHeight: 1.1,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
            maxWidth: '800px',
          }}
        >
          Markets are wrong.{' '}
          <span style={{ color: '#00ff88' }}>Prescio shows you where.</span>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: '20px',
            color: '#888888',
            lineHeight: 1.5,
            marginBottom: '48px',
            maxWidth: '720px',
          }}
        >
          AI edge detection across Kalshi, Polymarket, Metaculus, sports, esports &amp; crypto.
          Free to track — Pro to get the edge.
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {['Prediction Markets', 'Sports Analytics', 'Esports', 'Crypto Signals'].map((label) => (
            <div
              key={label}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '13px',
                fontWeight: 600,
                color: '#aaaaaa',
                letterSpacing: '0.02em',
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom divider line */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            left: '80px',
            right: '80px',
            height: '1px',
            background: 'rgba(255,255,255,0.06)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '80px',
            fontSize: '13px',
            color: '#444444',
            letterSpacing: '0.05em',
          }}
        >
          prescio.io
        </div>
      </div>
    ),
    { ...size }
  )
}
