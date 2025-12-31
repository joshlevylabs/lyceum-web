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
  'Pascal': '/partners/pascal.png',
  'GGEC': '/partners/GGEC.png',
  'dB Labs': '/partners/dBLabs.png',
  'LIZN': '/partners/LIZN.png',
  'Klippel': '/partners/klippel.png',
  'Listen Inc': '/partners/listeninc.png',
}

// Company logo components - uses actual images where available, SVG fallback otherwise
function CompanyLogo({ name }: { name: string }) {
  const imageClass = "h-10 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300 object-contain"
  const svgClass = "h-14 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300"

  // If we have an actual image for this company, use it
  if (logoImages[name]) {
    return (
      <Image
        src={logoImages[name]}
        alt={name}
        width={160}
        height={40}
        className={imageClass}
      />
    )
  }

  // Fallback to SVG for companies without images
  switch (name) {
    case 'Oculus':
      return (
        <svg className={svgClass} viewBox="0 0 140 40" fill="currentColor">
          <ellipse cx="20" cy="20" rx="16" ry="12" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-foreground/80"/>
          <ellipse cx="14" cy="20" rx="5" ry="5" className="text-foreground/80"/>
          <ellipse cx="26" cy="20" rx="5" ry="5" className="text-foreground/80"/>
          <text x="45" y="26" fontSize="16" fontWeight="bold" className="text-foreground/80" fill="currentColor">Oculus</text>
        </svg>
      )
    case 'Hansong Technology':
      return (
        <svg className={svgClass} viewBox="0 0 180 40" fill="currentColor">
          <path d="M8 10v20M8 20h12M20 10v20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-cyan-400" fill="none"/>
          <text x="30" y="26" fontSize="14" fontWeight="bold" className="text-foreground/80" fill="currentColor">Hansong</text>
          <text x="105" y="26" fontSize="10" className="text-foreground/50" fill="currentColor">Technology</text>
        </svg>
      )
    default:
      return (
        <span className="text-foreground/60 font-semibold text-lg">{name}</span>
      )
  }
}

export function SocialProofBar() {
  return (
    <section className="py-16 border-y border-foreground/5">
      <div className="max-w-7xl mx-auto px-6">
        {/* Stats - only show if we have data */}
        {stats.length > 0 && (
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
        )}

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
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-8">
            {companyLogos.map((company) => (
              <motion.div
                key={company.id}
                className="h-16 px-6 flex items-center justify-center"
                whileHover={{ scale: 1.08 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <CompanyLogo name={company.name} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
