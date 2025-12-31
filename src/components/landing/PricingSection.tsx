'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check } from '@phosphor-icons/react'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe-constants'
import { fadeInUp, staggerContainer, scaleIn } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'

interface PricingTier {
  key: string
  name: string
  price: number
  description: string
  features: string[]
  isPopular: boolean
  ctaText: string
}

const pricingTiers: PricingTier[] = [
  {
    key: 'starter',
    name: SUBSCRIPTION_PLANS.starter.name,
    price: SUBSCRIPTION_PLANS.starter.price,
    description: 'Perfect for small teams getting started with industrial analytics',
    features: SUBSCRIPTION_PLANS.starter.features,
    isPopular: false,
    ctaText: 'Start Free Trial'
  },
  {
    key: 'professional',
    name: SUBSCRIPTION_PLANS.professional.name,
    price: SUBSCRIPTION_PLANS.professional.price,
    description: 'For growing teams needing advanced features and support',
    features: SUBSCRIPTION_PLANS.professional.features,
    isPopular: true,
    ctaText: 'Start Free Trial'
  },
  {
    key: 'enterprise',
    name: SUBSCRIPTION_PLANS.enterprise.name,
    price: SUBSCRIPTION_PLANS.enterprise.price,
    description: 'For large organizations requiring unlimited scale',
    features: SUBSCRIPTION_PLANS.enterprise.features,
    isPopular: false,
    ctaText: 'Contact Sales'
  }
]

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <motion.div
      variants={scaleIn}
      className={`relative glass-card p-8 flex flex-col h-full ${
        tier.isPopular ? 'border-2 border-cyan-500 glow-cyan lg:scale-105 lg:z-10' : ''
      }`}
    >
      {/* Popular badge - Gold for premium emphasis */}
      {tier.isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-yellow-500 to-amber-400 text-black px-4 py-1 rounded-full text-sm font-semibold shadow-lg shadow-yellow-500/25">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground mb-2">{tier.name}</h3>
        <p className="text-sm text-foreground/50">{tier.description}</p>
      </div>

      {/* Price */}
      <div className="text-center mb-8">
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-gradient-cyan">
            ${tier.price}{tier.key === 'enterprise' && '+'}
          </span>
          <span className="text-foreground/50">/month</span>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-4 mb-8 flex-1">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Check className="w-3 h-3 text-cyan-400" />
            </div>
            <span className="text-foreground/70 text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <Link
        href={tier.key === 'enterprise' ? '/contact' : '/auth/signup'}
        className={`w-full text-center py-3 rounded-lg font-semibold transition-all ${
          tier.isPopular
            ? 'btn-primary'
            : 'btn-ghost'
        }`}
      >
        {tier.ctaText}
      </Link>
    </motion.div>
  )
}

export function PricingSection() {
  return (
    <SectionWrapper id="pricing" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.p variants={fadeInUp} className="text-cyan-400 font-semibold mb-4">
            Simple Pricing
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Choose Your Plan
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Start with a 30-day free trial. Scale as you grow.
          </motion.p>
        </motion.div>

        {/* Pricing cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-4 items-stretch"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {pricingTiers.map((tier) => (
            <PricingCard key={tier.key} tier={tier} />
          ))}
        </motion.div>

        {/* FAQ link */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-foreground/50">
            Have questions?{' '}
            <Link href="/faq" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Read our FAQ
            </Link>
            {' '}or{' '}
            <Link href="/contact" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              contact us
            </Link>
          </p>
        </motion.div>

        {/* Enterprise callout */}
        <motion.div
          className="mt-16 glass-card p-8 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h3 className="text-xl font-bold text-foreground mb-2">Need a custom solution?</h3>
          <p className="text-foreground/60 mb-6 max-w-2xl mx-auto">
            We offer custom enterprise plans with dedicated support, custom integrations, and volume discounts for large organizations.
          </p>
          <Link href="/contact" className="btn-ghost">
            Contact Enterprise Sales
          </Link>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
