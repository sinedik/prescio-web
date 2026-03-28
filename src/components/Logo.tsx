import { useTheme } from '../contexts/ThemeContext'

interface LogoProps {
  size?: number
  showText?: boolean
  textSize?: number
  /** 'auto' reads from ThemeContext; 'dark' / 'light' forces a specific variant */
  theme?: 'auto' | 'dark' | 'light'
  /** Override symbol color (e.g. 'rgb(var(--bg-base))' when placed on a green button) */
  symbolColor?: string
}

export default function Logo({
  size = 28,
  showText = true,
  textSize = 16,
  theme = 'auto',
  symbolColor,
}: LogoProps) {
  const { theme: currentTheme } = useTheme()
  const resolved = theme === 'auto' ? currentTheme : theme

  const color = symbolColor ?? (resolved === 'dark' ? 'rgb(var(--accent))' : 'rgb(var(--text-primary))')
  const accentColor = 'rgb(var(--accent))'

  return (
    <div className="flex items-center gap-2">
      {/* Eye-with-crosshair symbol */}
      <svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        fill="none"
        aria-label="Prescio logo"
      >
        {/* Upper arc — thick */}
        <path
          d="M10 40 Q40 10 70 40"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Lower arc — thin, faded */}
        <path
          d="M10 40 Q40 70 70 40"
          stroke={color}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Iris ring */}
        <circle cx="40" cy="40" r="11" stroke={color} strokeWidth="2" />
        {/* Crosshair lines — 4 tick marks */}
        <line x1="40" y1="25" x2="40" y2="31" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="40" y1="49" x2="40" y2="55" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="25" y1="40" x2="31" y2="40" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="49" y1="40" x2="55" y2="40" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        {/* Focus dot */}
        <circle cx="40" cy="40" r="4.5" fill={color} />
      </svg>

      {showText && (
        <span
          className="font-mono font-bold tracking-widest uppercase text-text-primary leading-none"
          style={{ fontSize: textSize }}
        >
          Presc<span style={{ color: accentColor }}>io</span>
        </span>
      )}
    </div>
  )
}
