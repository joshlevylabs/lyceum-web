'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { stats, companyLogos } from '@/data/landing'
import { staggerContainer, fadeInUp } from '@/lib/animation-variants'

// Animated counter component
function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (!isInView) return

    const duration = 2000
    const steps = 60
    const stepValue = value / steps
    const stepDuration = duration / steps
    let current = 0

    const timer = setInterval(() => {
      current += stepValue
      if (current >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(current))
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [isInView, value])

  // Format number with comma separators
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1)
    }
    return num.toLocaleString()
  }

  return (
    <span ref={ref} className="tabular-nums">
      {formatNumber(count)}{suffix}
    </span>
  )
}

export function SocialProofBar() {
  return (
    <section className="py-16 border-y border-foreground/5">
      <div className="max-w-7xl mx-auto px-6">
        {/* Stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.id}
              variants={fadeInUp}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient-cyan mb-2">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm sm:text-base text-foreground/50 font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Company logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-center text-sm text-foreground/40 mb-8">
            Trusted by engineers at leading companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {companyLogos.map((company) => (
              <div
                key={company.id}
                className="h-8 px-4 flex items-center justify-center rounded-md bg-foreground/5 text-foreground/30 font-medium text-sm hover:bg-foreground/10 hover:text-foreground/50 transition-colors"
              >
                {company.name}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
