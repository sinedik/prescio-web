'use client'
import React from 'react'
import Logo from './Logo'

interface PrescioLoaderProps {
  /** Accent color for frame border + logo + dividers. Defaults to current text color. */
  color?: string
  /** Primary caption (title) rendered below the rhombus. */
  label?: string
  /** Smaller secondary caption rendered under the divider. */
  sublabel?: string
  /** Frame edge length in px (the rhombus is square pre-rotation). Default 64. */
  size?: number
  /** Logo size inside the frame. Default = size * 0.5. */
  logoSize?: number
  /**
   * Visual state:
   * - `loading` (default) — rhombus spins with ease-in-out cycle
   * - `idle` — rhombus stops in its rest pose; used for empty/finished states
   *   so the same brand mark stays put (no swap to a different empty UI).
   */
  state?: 'loading' | 'idle'
}

// Brand-wide loader: rhombus + Prescio logo. Two states share the exact same
// rest pose so transitioning loading→idle (e.g. "fetch finished, no data")
// just stops the spin in place — the mark never disappears or jumps. Layout
// (frame size, pin dots, title/divider/sub) follows the original dota-empty
// design as the brand reference.
export default function PrescioLoader({
  color = 'currentColor',
  label,
  sublabel,
  size = 64,
  logoSize,
  state = 'loading',
}: PrescioLoaderProps) {
  const innerLogo = logoSize ?? Math.round(size * 0.5)
  const styleVar = { ['--loader-color' as string]: color } as React.CSSProperties
  return (
    <div className="prescio-loader" style={styleVar}>
      <div
        className={`prescio-loader-frame ${state === 'loading' ? 'is-loading' : 'is-idle'}`}
        style={{ width: size, height: size }}
      >
        <div>
          <Logo size={innerLogo} showText={false} symbolColor={color} />
        </div>
      </div>
      {label && <div className="prescio-loader-label">{label}</div>}
      {label && (
        <div className="prescio-loader-divider">
          <span className="ln ln-l" />
          <span className="dmd" />
          <span className="ln ln-r" />
        </div>
      )}
      {sublabel && <div className="prescio-loader-sublabel">{sublabel}</div>}
    </div>
  )
}
