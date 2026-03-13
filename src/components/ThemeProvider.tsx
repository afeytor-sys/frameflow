'use client'

import { createContext, useContext } from 'react'

// Single theme — no toggle needed
const ThemeContext = createContext({ theme: 'light' })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ theme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
export type Theme = 'light'
