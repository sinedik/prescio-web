import type { TopCategory } from '../types/index'

export const CATEGORIES: {
  value: TopCategory
  label: string
  subcategories: { value: string; label: string }[]
}[] = [
  {
    value: 'crypto',
    label: 'Crypto',
    subcategories: [
      { value: 'bitcoin',  label: 'Bitcoin'    },
      { value: 'ethereum', label: 'Ethereum'   },
      { value: 'defi',     label: 'DeFi'       },
      { value: 'altcoins', label: 'Altcoins'   },
      { value: 'web3',     label: 'NFT / Web3' },
    ],
  },
  {
    value: 'politics',
    label: 'Politics',
    subcategories: [
      { value: 'us_politics', label: 'US Politics'         },
      { value: 'elections',   label: 'Elections'           },
      { value: 'geopolitics', label: 'Geopolitics'         },
      { value: 'regulation',  label: 'Policy & Regulation' },
    ],
  },
  {
    value: 'economics',
    label: 'Economics',
    subcategories: [
      { value: 'stocks',      label: 'Markets & Stocks' },
      { value: 'commodities', label: 'Commodities'      },
      { value: 'macro',       label: 'Macro'            },
      { value: 'tech',        label: 'Tech Industry'    },
    ],
  },
  {
    value: 'sport',
    label: 'Sport',
    subcategories: [
      { value: 'football',    label: 'Football'     },
      { value: 'tennis',      label: 'Tennis'       },
      { value: 'basketball',  label: 'Basketball'   },
      { value: 'baseball',    label: 'Baseball'     },
      { value: 'mma',         label: 'MMA / Boxing' },
      { value: 'other_sport', label: 'Other'        },
    ],
  },
  {
    value: 'esports',
    label: 'Esports',
    subcategories: [
      { value: 'dota2',        label: 'Dota 2'  },
      { value: 'cs2',          label: 'CS2'     },
      { value: 'lol',          label: 'LoL'     },
      { value: 'valorant',     label: 'Valorant'},
      { value: 'other_esport', label: 'Other'   },
    ],
  },
  {
    value: 'science_tech',
    label: 'Science & Tech',
    subcategories: [
      { value: 'ai_ml',   label: 'AI & ML'  },
      { value: 'space',   label: 'Space'    },
      { value: 'climate', label: 'Climate'  },
      { value: 'health',  label: 'Health'   },
    ],
  },
]

export const SOURCE_LABELS: Record<string, string> = {
  polymarket:  'Polymarket',
  kalshi:      'Kalshi',
  metaculus:   'Metaculus',
  odds_api:    'The Odds API',
  pandascore:  'PandaScore',
  user_search: 'My Research',
}

export const SOURCE_COLORS: Record<string, string> = {
  polymarket:  'var(--poly)',
  kalshi:      'var(--kalshi)',
  metaculus:   'var(--metaculus)',
  odds_api:    'var(--accent)',
  pandascore:  'var(--watch)',
  user_search: 'var(--accent)',
}

export const getCategoryLabel = (value: TopCategory): string =>
  CATEGORIES.find(c => c.value === value)?.label ?? value

export const getSubcategoryLabel = (category: TopCategory, sub: string): string =>
  CATEGORIES.find(c => c.value === category)?.subcategories.find(s => s.value === sub)?.label ?? sub
