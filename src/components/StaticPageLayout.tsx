'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'
import { LyceumLogo } from '@/components/LyceumLogo'
import { LandingFooter } from '@/components/landing'

interface StaticPageLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  showBackLink?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl'
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl'
}

export function StaticPageLayout({
  children,
  title,
  subtitle,
  showBackLink = true,
  maxWidth = '4xl'
}: StaticPageLayoutProps) {
  return (
    <div className="bg-background min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-foreground/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <LyceumLogo size="md" />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-sm font-medium hover:bg-cyan-400 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-16">
        <div className={`${maxWidthClasses[maxWidth]} mx-auto px-6`}>
          {/* Back link */}
          {showBackLink && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8"
            >
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-foreground/50 hover:text-cyan-400 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>
            </motion.div>
          )}

          {/* Page header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12"
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
              {title}
            </h1>
            {subtitle && (
              <p className="text-lg text-foreground/60 max-w-2xl">
                {subtitle}
              </p>
            )}
          </motion.div>

          {/* Page content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {children}
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}

// Content section component for consistent styling
interface ContentSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function ContentSection({ title, children, className = '' }: ContentSectionProps) {
  return (
    <section className={`mb-12 ${className}`}>
      {title && (
        <h2 className="text-2xl font-bold text-foreground mb-4">{title}</h2>
      )}
      <div className="prose prose-invert prose-cyan max-w-none">
        {children}
      </div>
    </section>
  )
}

// FAQ Accordion component
interface FAQItem {
  question: string
  answer: string
}

interface FAQAccordionProps {
  items: FAQItem[]
}

export function FAQAccordion({ items }: FAQAccordionProps) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <details
          key={index}
          className="group glass-card overflow-hidden"
        >
          <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
            <h3 className="text-lg font-semibold text-foreground pr-4">{item.question}</h3>
            <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center flex-shrink-0 group-open:bg-cyan-500/20 transition-colors">
              <svg
                className="w-4 h-4 text-foreground/50 group-open:text-cyan-400 group-open:rotate-180 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </summary>
          <div className="px-6 pb-6 pt-0">
            <p className="text-foreground/70 leading-relaxed">{item.answer}</p>
          </div>
        </details>
      ))}
    </div>
  )
}

// Contact form component
interface ContactFormProps {
  onSubmit?: (data: { name: string; email: string; message: string }) => void
}

export function ContactForm({ onSubmit }: ContactFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    onSubmit?.({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
          Name
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
          placeholder="Your name"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors"
          placeholder="you@company.com"
        />
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors resize-none"
          placeholder="How can we help?"
        />
      </div>
      <button
        type="submit"
        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all"
      >
        Send Message
      </button>
    </form>
  )
}
