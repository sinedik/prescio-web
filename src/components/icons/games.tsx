interface LogoProps {
  size?: number
  className?: string
}

// ─── Esports ─────────────────────────────────────────────────────────────────

/** Dota 2 — shield + D shape */
export function LogoDota2({ size = 20, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M1 1v14.93l3.27 7.07H12V1H1zm9 20H5.35L3 15.9V3h7v18zM13 1v22h6.73L23 15.93V1H13zm8 14.9-2.35 5.1H15V3h6v12.9z"/>
    </svg>
  )
}

/** Counter-Strike 2 */
export function LogoCS2({ size = 20, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M0 0v24h24V0H0zm6.5 6.5h4v2h-2v7h2v2h-4v-2h2V8.5h-2V6.5zm7 0h4v2h-4v3h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4v-2h4v-2h-2a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z"/>
    </svg>
  )
}

/** League of Legends — stylised L icon */
export function LogoLoL({ size = 20, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M2.05 12A9.95 9.95 0 0 1 12 2.05V0A12 12 0 0 0 0 12h2.05zM12 21.95A9.95 9.95 0 0 1 2.05 12H0A12 12 0 0 0 12 24v-2.05zM14 0v12.88l3.59 3.61 1.44-1.44L16 12.12V0h-2zm-2 24a12 12 0 0 0 8.78-3.78l-1.44-1.44A9.95 9.95 0 0 1 12 21.95V24z"/>
    </svg>
  )
}

/** Valorant — V chevron */
export function LogoValorant({ size = 20, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M0 1.5l9 21H12L3.28 1.5H0zM12 1.5L21 22.5h-3L12 7.35 11.14 5.5 12 3.63V1.5zM14.86 1.5L24 22.5h-3l-7.5-17.5L14.86 1.5z"/>
    </svg>
  )
}

// ─── Traditional Sports ───────────────────────────────────────────────────────

/** Football / Soccer */
export function LogoFootball({ size = 20, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2c0 0 3.5 3 3.5 6.5S12 15 12 15s-3.5-3-3.5-6.5S12 2 12 2z" />
      <path d="M2.5 8.5L7 10l1 5-4 2.5" />
      <path d="M21.5 8.5L17 10l-1 5 4 2.5" />
      <path d="M8 20l4-5 4 5" />
    </svg>
  )
}

/** Basketball */
export function LogoBasketball({ size = 20, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93C7 7 8 9.5 8 12s-1 5-3.07 7.07" />
      <path d="M19.07 4.93C17 7 16 9.5 16 12s1 5 3.07 7.07" />
      <path d="M2 12h20" />
    </svg>
  )
}

/** Tennis */
export function LogoTennis({ size = 20, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M5.5 5.5C7.5 7.5 8.5 10 8.5 12s-1 4.5-3 6.5" />
      <path d="M18.5 5.5C16.5 7.5 15.5 10 15.5 12s1 4.5 3 6.5" />
    </svg>
  )
}

/** MMA / UFC fist glove */
export function LogoMMA({ size = 20, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="8" width="10" height="8" rx="2" />
      <rect x="14" y="9" width="6" height="6" rx="2" />
      <path d="M4 12h10" />
      <path d="M8 8V5a2 2 0 0 1 4 0v3" />
    </svg>
  )
}

// ─── Category map ─────────────────────────────────────────────────────────────

export const GAME_LOGOS: Record<string, (props: LogoProps) => JSX.Element> = {
  dota2:      LogoDota2,
  cs2:        LogoCS2,
  lol:        LogoLoL,
  valorant:   LogoValorant,
  football:   LogoFootball,
  basketball: LogoBasketball,
  tennis:     LogoTennis,
  mma:        LogoMMA,
}

export function GameLogo({ discipline, size = 16, className }: { discipline: string; size?: number; className?: string }) {
  const Logo = GAME_LOGOS[discipline.toLowerCase()]
  if (!Logo) return null
  return <Logo size={size} className={className} />
}
