'use client'

import { useState, useEffect, useCallback } from 'react'

interface ScrollSpyOptions {
  sectionIds: string[]
  offset?: number
  throttleMs?: number
}

export function useScrollSpy({
  sectionIds,
  offset = 100,
  throttleMs = 100
}: ScrollSpyOptions) {
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [isScrolled, setIsScrolled] = useState(false)

  const handleScroll = useCallback(() => {
    const scrollPosition = window.scrollY + offset

    // Check if page is scrolled (for navbar background)
    setIsScrolled(window.scrollY > 50)

    // Find the current active section
    let currentSection: string | null = null

    for (const sectionId of sectionIds) {
      const element = document.getElementById(sectionId)
      if (element) {
        const { offsetTop, offsetHeight } = element
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          currentSection = sectionId
          break
        }
      }
    }

    // If we're at the top, set the first section as active
    if (!currentSection && window.scrollY < 100 && sectionIds.length > 0) {
      currentSection = sectionIds[0]
    }

    setActiveSection(currentSection)
  }, [sectionIds, offset])

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    const throttledScroll = () => {
      if (timeoutId) return
      timeoutId = setTimeout(() => {
        handleScroll()
        timeoutId = null
      }, throttleMs)
    }

    // Initial check
    handleScroll()

    window.addEventListener('scroll', throttledScroll, { passive: true })
    window.addEventListener('resize', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', throttledScroll)
      window.removeEventListener('resize', handleScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [handleScroll, throttleMs])

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      const navHeight = 80 // Account for sticky nav
      const elementPosition = element.offsetTop - navHeight

      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      })
    }
  }, [])

  return {
    activeSection,
    isScrolled,
    scrollToSection
  }
}

// Hook for detecting if element is in viewport
export function useInViewport(elementId: string, threshold = 0.5) {
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = document.getElementById(elementId)
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting)
      },
      { threshold }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [elementId, threshold])

  return isInView
}

// Hook for scroll progress (useful for progress bars)
export function useScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
      // Guard against division by zero or negative values
      if (scrollHeight <= 0) {
        setProgress(0)
        return
      }
      const scrollProgress = (window.scrollY / scrollHeight) * 100
      const clampedProgress = Math.min(100, Math.max(0, scrollProgress))
      // Only update if the value is a valid number
      if (Number.isFinite(clampedProgress)) {
        setProgress(clampedProgress)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll() // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return progress
}
