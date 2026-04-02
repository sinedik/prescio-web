import { LogoDota2, LogoCS2, LogoLoL, LogoValorant, LogoFootball, LogoBasketball, LogoTennis, LogoBaseball, LogoMMA } from '../icons/games'

export const SPORT_TABS = [
  { value: 'football',   label: 'Football',   icon: <LogoFootball size={13} />   },
  { value: 'basketball', label: 'Basketball', icon: <LogoBasketball size={13} /> },
  { value: 'tennis',     label: 'Tennis',     icon: <LogoTennis size={13} />     },
  { value: 'baseball',   label: 'Baseball',   icon: <LogoBaseball size={13} />   },
  { value: 'mma',        label: 'MMA',        icon: <LogoMMA size={13} />        },
]

export const ESPORT_TABS = [
  { value: 'dota2',    label: 'Dota 2',   icon: <LogoDota2 size={13} />    },
  { value: 'cs2',      label: 'CS2',      icon: <LogoCS2 size={13} />      },
  { value: 'lol',      label: 'LoL',      icon: <LogoLoL size={13} />      },
  { value: 'valorant', label: 'Valorant', icon: <LogoValorant size={13} /> },
]

export function TabBtn({ value: _v, active, onClick, icon, children }: {
  value: string; active: boolean; onClick: () => void; icon?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all border ${
        active
          ? 'bg-accent text-bg-base border-accent font-semibold'
          : 'bg-bg-elevated text-text-secondary border-bg-border hover:text-text-primary hover:border-text-muted'
      }`}
    >
      {icon && <span className={active ? 'opacity-90' : 'opacity-50'}>{icon}</span>}
      {children}
    </button>
  )
}
