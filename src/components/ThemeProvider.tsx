'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'light' | 'warm' | 'dark'

const ThemeContext = createContext<{
  theme: Theme
  setTheme: (t: Theme) => void
  cycle: () => void
}>({ theme: 'warm', setTheme: () => {}, cycle: () => {} })

const THEMES: Theme[] = ['light', 'warm', 'dark']

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.classList.remove('light', 'warm', 'dark')
  if (theme !== 'warm') root.classList.add(theme)
  // warm = :root (no class needed)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('warm')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('ff-theme') as Theme | null
    const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'warm'
    const initial = stored || preferred
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('ff-theme', t)
    applyTheme(t)
  }

  const cycle = () => {
    const idx = THEMES.indexOf(theme)
    const next = THEMES[(idx + 1) % THEMES.length]
    setTheme(next)
  }

  if (!mounted) return <>{children}</>

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
