'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type ThemeMode = 'light' | 'dark' | 'custom'

interface CustomThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
}

interface ThemeContextType {
  theme: ThemeMode
  customColors: CustomThemeColors
  setTheme: (theme: ThemeMode) => void
  setCustomColors: (colors: Partial<CustomThemeColors>) => void
  resetCustomColors: () => void
}

const defaultCustomColors: CustomThemeColors = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  background: '#ffffff',
  surface: '#f9fafb',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark')
  const [customColors, setCustomColorsState] = useState<CustomThemeColors>(defaultCustomColors)
  const [mounted, setMounted] = useState(false)

  // Load theme from localStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('lyceum_theme') as ThemeMode
    const savedColors = localStorage.getItem('lyceum_custom_colors')
    
    if (savedTheme) {
      setThemeState(savedTheme)
    } else {
      // Set default theme to dark if no saved theme
      localStorage.setItem('lyceum_theme', 'dark')
    }
    
    if (savedColors) {
      try {
        setCustomColorsState(JSON.parse(savedColors))
      } catch (e) {
        console.error('Failed to parse custom colors:', e)
      }
    }
  }, [])

  // Apply theme changes
  useEffect(() => {
    if (!mounted) return

    const root = document.documentElement
    
    // Remove all theme classes
    root.classList.remove('light', 'dark', 'custom')
    
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'custom') {
      root.classList.add('custom')
      // Apply custom CSS variables
      root.style.setProperty('--color-primary', customColors.primary)
      root.style.setProperty('--color-secondary', customColors.secondary)
      root.style.setProperty('--color-background', customColors.background)
      root.style.setProperty('--color-surface', customColors.surface)
      root.style.setProperty('--color-text', customColors.text)
      root.style.setProperty('--color-text-secondary', customColors.textSecondary)
      root.style.setProperty('--color-border', customColors.border)
    } else {
      root.classList.add('light')
      // Clear custom variables
      root.style.removeProperty('--color-primary')
      root.style.removeProperty('--color-secondary')
      root.style.removeProperty('--color-background')
      root.style.removeProperty('--color-surface')
      root.style.removeProperty('--color-text')
      root.style.removeProperty('--color-text-secondary')
      root.style.removeProperty('--color-border')
    }
  }, [theme, customColors, mounted])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('lyceum_theme', newTheme)
  }

  const setCustomColors = (colors: Partial<CustomThemeColors>) => {
    setCustomColorsState(prevColors => {
      const newColors = { ...prevColors, ...colors }
      localStorage.setItem('lyceum_custom_colors', JSON.stringify(newColors))
      return newColors
    })
  }

  const resetCustomColors = () => {
    setCustomColorsState(defaultCustomColors)
    localStorage.setItem('lyceum_custom_colors', JSON.stringify(defaultCustomColors))
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        customColors,
        setTheme,
        setCustomColors,
        resetCustomColors
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
