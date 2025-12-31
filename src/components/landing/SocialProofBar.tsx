'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
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

// Map company names to their logo image paths
const logoImages: Record<string, string> = {
  'Amazon Lab126': '/partners/amazonLab126.png',
  'Meta': '/partners/meta.png',
  'Sonance': '/partners/sonance.png',
  'Dolby': '/partners/dolby.png',
  'GGEC': '/partners/GGEC.png',
  'dB Labs': '/partners/dBLabs.png',
  'LIZN': '/partners/LIZN.png',
  'Klippel': '/partners/klippel.png',
  'Listen Inc': '/partners/listeninc.png',
}

// Uniform logo height for conveyor belt
const LOGO_HEIGHT = 40 // pixels

// Company logo components - uses actual images where available, SVG fallback otherwise
function CompanyLogo({ name }: { name: string }) {
  const imageClass = "h-10 w-auto opacity-85 hover:opacity-100 transition-opacity duration-300 object-contain"
  const svgClass = "h-10 w-auto opacity-85 hover:opacity-100 transition-opacity duration-300"

  // If we have an actual image for this company, use it
  if (logoImages[name]) {
    return (
      <Image
        src={logoImages[name]}
        alt={name}
        width={160}
        height={LOGO_HEIGHT}
        className={imageClass}
        style={{ height: LOGO_HEIGHT, width: 'auto' }}
      />
    )
  }

  // Fallback to SVG for companies without images
  switch (name) {
    case 'Oculus':
      return (
        <svg className={svgClass} viewBox="0 0 140 40" fill="currentColor">
          <ellipse cx="20" cy="20" rx="16" ry="12" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/60"/>
          <ellipse cx="14" cy="20" rx="5" ry="5" className="text-foreground/60"/>
          <ellipse cx="26" cy="20" rx="5" ry="5" className="text-foreground/60"/>
          <text x="45" y="26" fontSize="16" fontWeight="bold" className="text-foreground/60" fill="currentColor">Oculus</text>
        </svg>
      )
    case 'Hansong':
      return (
        <span
          className="text-foreground/60 hover:text-foreground/85 transition-colors duration-300 text-2xl tracking-wide"
          style={{ fontFamily: "'Newhouse DT Pro Black', 'Arial Black', sans-serif", fontWeight: 900 }}
        >
          HANSONG
        </span>
      )
    default:
      return (
        <span className="text-foreground/60 font-bold text-lg">{name}</span>
      )
  }
}

export function SocialProofBar() {
  return (
    <section className="py-10 sm:py-12 md:py-16 border-y border-foreground/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Stats - only show if we have data */}
        {stats.length > 0 && (
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-12 md:mb-16"
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
                <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gradient-cyan mb-1 sm:mb-2">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-xs sm:text-sm md:text-base text-foreground/50 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Company logos with conveyor belt */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          {/* Gold badge */}
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-yellow-400 shadow-lg shadow-yellow-500/10">
              Trusted by engineers at leading companies
            </span>
          </div>

          {/* Conveyor belt container with fade edges */}
          <div className="relative overflow-hidden">
            {/* Left fade */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            {/* Right fade */}
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

            {/* Scrolling logos container */}
            <div className="flex animate-scroll-left">
              {/* First set of logos */}
              <div className="flex items-center gap-16 px-8 shrink-0">
                {companyLogos.map((company) => (
                  <div
                    key={company.id}
                    className="h-12 flex items-center justify-center shrink-0"
                  >
                    <CompanyLogo name={company.name} />
                  </div>
                ))}
              </div>
              {/* Duplicate set for seamless loop */}
              <div className="flex items-center gap-16 px-8 shrink-0">
                {companyLogos.map((company) => (
                  <div
                    key={`dup-${company.id}`}
                    className="h-12 flex items-center justify-center shrink-0"
                  >
                    <CompanyLogo name={company.name} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
