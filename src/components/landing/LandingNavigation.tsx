'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { List, X } from '@phosphor-icons/react'
import { useScrollSpy, useScrollProgress } from '@/hooks/useScrollSpy'
import { LyceumLogo } from '@/components/LyceumLogo'

const navItems = [
  { label: 'Features', sectionId: 'features' },
  { label: 'Use Cases', sectionId: 'use-cases' },
  { label: 'Plugins', sectionId: 'plugins' },
  { label: 'Pricing', sectionId: 'pricing' },
  { label: 'Testimonials', sectionId: 'testimonials' }
]

export function LandingNavigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { activeSection, isScrolled, scrollToSection } = useScrollSpy({
    sectionIds: navItems.map((item) => item.sectionId),
    offset: 100
  })
  const scrollProgress = useScrollProgress()

  const handleNavClick = (sectionId: string) => {
    scrollToSection(sectionId)
    setMobileMenuOpen(false)
  }

  return (
    <>
      <motion.header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'glass-panel border-b border-cyan-500/10'
            : 'bg-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-cyan-500 to-cyan-400" style={{ width: `${scrollProgress}%` }} />

        <nav className="flex items-center justify-between px-6 py-4 lg:px-8" aria-label="Global">
          {/* Logo */}
          <div className="flex lg:flex-1">
            <Link href="/" className="flex items-center group">
              <LyceumLogo size="md" />
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex lg:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2.5 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <span className="sr-only">Open main menu</span>
              <List className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          {/* Desktop navigation */}
          <div className="hidden lg:flex lg:gap-x-1">
            {navItems.map((item) => (
              <button
                key={item.sectionId}
                onClick={() => handleNavClick(item.sectionId)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeSection === item.sectionId
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-foreground/70 hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA buttons */}
          <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="btn-primary text-sm"
            >
              Start Free Trial
            </Link>
          </div>
        </nav>
      </motion.header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Menu panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-sm glass-panel lg:hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-foreground/10">
                <Link href="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
                  <LyceumLogo size="md" />
                </Link>
                <button
                  type="button"
                  className="rounded-lg p-2.5 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="sr-only">Close menu</span>
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <div className="px-6 py-6 space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.sectionId}
                    onClick={() => handleNavClick(item.sectionId)}
                    className={`block w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                      activeSection === item.sectionId
                        ? 'text-cyan-400 bg-cyan-500/10'
                        : 'text-foreground/70 hover:text-foreground hover:bg-foreground/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-foreground/10">
                <div className="flex flex-col gap-3">
                  <Link
                    href="/auth/signup"
                    className="btn-primary text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Start Free Trial
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="btn-ghost text-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
