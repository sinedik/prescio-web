interface IconProps {
  size?: number
  color?: string
  className?: string
}

export const IconSun = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
    <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
    <line x1="19.78" y1="4.22" x2="17.66" y2="6.34" />
    <line x1="6.34" y1="17.66" x2="4.22" y2="19.78" />
  </svg>
)

export const IconMoon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

export const IconBolt = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M13 2L4.5 13.5H11L10 22L19.5 10.5H13L13 2Z" />
  </svg>
)

export const IconCheck = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 6L9 17L4 12" />
  </svg>
)

export const IconGift = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M12 11V22" />
    <path d="M3 16H21" />
    <path d="M12 11C12 11 8 11 8 7.5C8 5.5 9.5 4 11 4C13 4 12 7 12 11Z" />
    <path d="M12 11C12 11 16 11 16 7.5C16 5.5 14.5 4 13 4C11 4 12 7 12 11Z" />
  </svg>
)

export const IconLock = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V7C8 4.79 9.79 3 12 3C14.21 3 16 4.79 16 7V11" />
    <circle cx="12" cy="16" r="1.5" fill={color} />
  </svg>
)

export const IconFlame = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22C8.13 22 5 18.87 5 15C5 11 8 9 9 7C9 7 9 10 11 11C11 8 13 5 16 3C16 7 18 9 19 12C19.67 13.19 20 14.06 20 15C20 18.87 16.87 22 13 22" />
    <path d="M12 22C10.34 22 9 20.66 9 19C9 17 11 16 11 14C11 14 12.5 15.5 12.5 17C13.5 16 14 14.5 14 13C15 14 15 16 15 17C15 19.76 13.76 22 12 22Z" />
  </svg>
)

export const IconTrendUp = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
)

export const IconSprout = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22V12" />
    <path d="M12 12C12 12 7 12 5 8C3 4 6 1 9 2C10.5 2.5 11.5 4 12 6" />
    <path d="M12 12C12 12 17 10 18 6C19 2 16 0 13.5 1C12 1.5 12 4 12 6" />
  </svg>
)

export const IconStar = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)

export const IconTarget = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" fill={color} />
  </svg>
)

export const IconFileText = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="7" y1="8" x2="17" y2="8" />
    <line x1="7" y1="12" x2="17" y2="12" />
    <line x1="7" y1="16" x2="13" y2="16" />
  </svg>
)

export const IconGlobe = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12H21" />
    <path d="M12 3C12 3 8 7 8 12C8 17 12 21 12 21" />
    <path d="M12 3C12 3 16 7 16 12C16 17 12 21 12 21" />
  </svg>
)

export const IconMapPin = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z" />
    <circle cx="12" cy="9" r="3" />
  </svg>
)
