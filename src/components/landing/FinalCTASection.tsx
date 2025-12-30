'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from '@phosphor-icons/react'
import { fadeInUp, staggerContainer } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'

export function FinalCTASection() {
  return (
    <SectionWrapper id="cta" className="py-24">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="relative glass-card p-12 md:p-16 text-center overflow-hidden"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl opacity-50" />

          {/* Content */}
          <div className="relative z-10">
            <motion.h2
              variants={fadeInUp}
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6"
            >
              Ready to Transform Your{' '}
              <span className="text-gradient-cyan">Analytics Workflow</span>?
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-foreground/60 max-w-2xl mx-auto mb-10"
            >
              Join thousands of engineers who trust Lyceum for their industrial measurement analysis.
              Start your free trial today and experience the difference.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <motion.div
                animate={{
                  boxShadow: [
                    '0 0 20px rgba(0, 212, 255, 0.3)',
                    '0 0 40px rgba(0, 212, 255, 0.5)',
                    '0 0 20px rgba(0, 212, 255, 0.3)'
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
              >
                <Link
                  href="/auth/signup"
                  className="btn-primary text-lg px-8 py-4 flex items-center gap-2 group"
                >
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
              <Link
                href="/demo"
                className="btn-ghost text-lg px-8 py-4"
              >
                Schedule a Demo
              </Link>
            </motion.div>

            <motion.p
              variants={fadeInUp}
              className="mt-8 text-sm text-foreground/40"
            >
              30-day free trial &bull; Cancel anytime
            </motion.p>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
