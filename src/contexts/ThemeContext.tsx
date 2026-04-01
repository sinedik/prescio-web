'use client'

import { createContext, useContext, useLayoutEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('prescio-theme')
      return stored === 'light' ? 'light' : 'dark'
    } catch {
      return 'dark'
    }
  })

  // useLayoutEffect fires synchronously BEFORE browser paint — prevents flash
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('prescio-theme', theme) } catch { /* */ }
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
  }

  function toggleTheme() {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
