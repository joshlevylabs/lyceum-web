'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Import all landing page components
import {
  LandingNavigation,
  HeroSection,
  SocialProofBar,
  ProductOverview,
  UseCasesSection,
  PluginShowcase,
  FeaturesDeepDive,
  TestimonialsSection,
  StorySection,
  PricingSection,
  FinalCTASection,
  LandingFooter,
  GlobalStarField
} from '@/components/landing'

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center animate-pulse">
            <span className="text-xl font-bold text-black">L</span>
          </div>
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  // Redirect if logged in
  if (user) {
    return null
  }

  return (
    <div className="bg-background min-h-screen scroll-smooth relative">
      {/* Global star field background */}
      <GlobalStarField />

      {/* Navigation */}
      <LandingNavigation />

      {/* Main content */}
      <main>
        {/* Hero - Above the fold */}
        <HeroSection />

        {/* Social proof - Trusted companies */}
        <SocialProofBar />

        {/* Product showcase - Show don't tell */}
        <ProductOverview />

        {/* Features deep dive - Core value proposition */}
        <FeaturesDeepDive />

        {/* Use cases - Industry relevance */}
        <UseCasesSection />

        {/* Plugin showcase - Extensibility */}
        <PluginShowcase />

        {/* Testimonials - Social proof */}
        <TestimonialsSection />

        {/* Our Story - Company background */}
        <StorySection />

        {/* Pricing - Conversion focused */}
        <PricingSection />

        {/* Final CTA - Last chance conversion */}
        <FinalCTASection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
