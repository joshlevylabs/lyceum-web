'use client'

import { ThemeProvider } from '@/contexts/ThemeContext'

export function ClientThemeProvider({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
