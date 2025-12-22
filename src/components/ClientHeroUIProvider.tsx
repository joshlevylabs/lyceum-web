'use client'

import { HeroUIProvider } from '@heroui/react'

interface ClientHeroUIProviderProps {
  children: React.ReactNode
}

export function ClientHeroUIProvider({ children }: ClientHeroUIProviderProps) {
  return (
    <HeroUIProvider>
      {children}
    </HeroUIProvider>
  )
}
