import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#080808',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 80 80" width={140} height={140}>
          <path d="M10 40 Q40 10 70 40" stroke="#00ff88" strokeWidth="3.5" strokeLinecap="round" fill="none" />
          <path d="M10 40 Q40 70 70 40" stroke="#00ff88" strokeWidth="1.8" strokeLinecap="round" opacity="0.5" fill="none" />
          <circle cx="40" cy="40" r="11" stroke="#00ff88" strokeWidth="2" fill="none" />
          <line x1="40" y1="25" x2="40" y2="31" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="40" y1="49" x2="40" y2="55" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="25" y1="40" x2="31" y2="40" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="49" y1="40" x2="55" y2="40" stroke="#00ff88" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="40" cy="40" r="4.5" fill="#00ff88" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
