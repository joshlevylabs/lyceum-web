'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Play, Sparkle } from '@phosphor-icons/react'
import { fadeInUp, staggerContainer } from '@/lib/animation-variants'
import { VideoModal } from './PlaceholderVideo'
import { ScreenOverlay } from './ScreenOverlay'

// Rotating keywords for the tagline - all use primary cyan
const transformations = [
  { from: 'Chaos', to: 'Clarity' },
  { from: 'Spreadsheets', to: 'Insights' },
  { from: 'Silos', to: 'Unity' },
  { from: 'Guesswork', to: 'Precision' },
]

// Generate frequency response curve data
function generateFrequencyResponse(variation: number, isGolden: boolean = false) {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i <= 100; i++) {
    const x = i
    let y = 50 + Math.sin(i * 0.05) * 10 + Math.sin(i * 0.15) * 5
    y += (Math.random() - 0.5) * variation
    if (isGolden) {
      y = 50 + Math.sin(i * 0.05) * 8 + Math.sin(i * 0.15) * 3
    }
    y = Math.max(20, Math.min(80, y))
    points.push({ x, y })
  }
  return points
}

// Frequency Response Graph - Floating position
function FrequencyResponseGraph() {
  const curves = useMemo(() => {
    const result = []
    for (let i = 0; i < 25; i++) {
      result.push({
        id: i,
        points: generateFrequencyResponse(12 + Math.random() * 8),
        isGolden: false,
      })
    }
    result.push({ id: 'golden-1', points: generateFrequencyResponse(2, true), isGolden: true })
    result.push({ id: 'golden-2', points: generateFrequencyResponse(2, true).map(p => ({ x: p.x, y: p.y - 3 })), isGolden: true })
    return result
  }, [])

  const pathFromPoints = (points: { x: number; y: number }[]) => {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x * 2.5} ${100 - p.y}`).join(' ')
  }

  return (
    <motion.div
      className="absolute left-[3%] top-[15%] hidden lg:block z-20"
      initial={{ opacity: 0, x: -30, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: 0.8, duration: 1 }}
    >
      <motion.div
        className="glass-card p-4 w-72 xl:w-80 border border-foreground/10 shadow-xl shadow-cyan-500/5"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-foreground/60 font-medium">Frequency Response</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-cyan-400" />
            <span className="text-[10px] text-cyan-400 font-medium">Golden</span>
          </div>
        </div>
        <div className="relative h-24 xl:h-28 bg-foreground/[0.02] rounded-lg border border-foreground/5 overflow-hidden">
          <div className="absolute left-0 right-0 top-[20%] bottom-[20%] bg-cyan-500/5 border-y border-cyan-500/20" />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 250 100" preserveAspectRatio="none">
            {curves.filter(c => !c.isGolden).map((curve) => (
              <motion.path
                key={curve.id}
                d={pathFromPoints(curve.points)}
                fill="none"
                stroke="rgba(148,163,184,0.25)"
                strokeWidth="0.8"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.5 }}
              />
            ))}
            {curves.filter(c => c.isGolden).map((curve, i) => (
              <motion.path
                key={curve.id}
                d={pathFromPoints(curve.points)}
                fill="none"
                stroke="#00d4ff"
                strokeWidth="1.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: 1 + i * 0.2 }}
                filter="url(#glowSmall)"
              />
            ))}
            <defs>
              <filter id="glowSmall">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
          </svg>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-foreground/40">
          <span>20Hz</span>
          <span>20kHz</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Yield Panel - Floating position
function YieldPanel() {
  const [animatedYield, setAnimatedYield] = useState(0)

  useEffect(() => {
    const targetYield = 97.3
    const duration = 2000
    const steps = 60
    const increment = targetYield / steps
    let current = 0
    const timer = setInterval(() => {
      current += increment
      if (current >= targetYield) {
        setAnimatedYield(targetYield)
        clearInterval(timer)
      } else {
        setAnimatedYield(current)
      }
    }, duration / steps)
    return () => clearInterval(timer)
  }, [])

  return (
    <motion.div
      className="absolute right-[3%] top-[12%] hidden lg:block z-20"
      initial={{ opacity: 0, x: 30, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: 1, duration: 1 }}
    >
      <motion.div
        className="glass-card p-4 w-52 xl:w-56 border border-foreground/10 shadow-xl shadow-cyan-500/5"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-foreground/60 font-medium">Production Yield</span>
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl xl:text-5xl font-bold text-gradient-cyan font-mono">{animatedYield.toFixed(1)}</span>
          <span className="text-xl text-cyan-400">%</span>
        </div>
        <div className="mt-3 h-2 bg-foreground/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${animatedYield}%` }}
            transition={{ duration: 2, delay: 0.5 }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-foreground/50">
          <span>1,247 passed</span>
          <span className="text-cyan-400 font-medium">+2.1%↑</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Control Limits Panel - Floating position
function ControlLimitsPanel() {
  return (
    <motion.div
      className="absolute right-[2%] bottom-[25%] hidden lg:block z-20"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2, duration: 1 }}
    >
      <motion.div
        className="glass-card p-4 w-48 xl:w-52 border border-foreground/10 shadow-xl shadow-cyan-500/5"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-foreground/60 font-medium">Control Limits</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-medium">Active</span>
        </div>
        <div className="space-y-2">
          {[
            { label: 'USL', value: '+3σ', color: 'text-foreground/70', bg: 'bg-foreground/50' },
            { label: 'Target', value: '0σ', color: 'text-cyan-400', bg: 'bg-cyan-400' },
            { label: 'LSL', value: '-3σ', color: 'text-foreground/70', bg: 'bg-foreground/50' },
          ].map((limit, i) => (
            <motion.div
              key={limit.label}
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + i * 0.1 }}
            >
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${limit.bg}`} />
                <span className="text-[11px] text-foreground/60">{limit.label}</span>
              </div>
              <span className={`text-[11px] font-mono font-medium ${limit.color}`}>{limit.value}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// THD Panel - Floating position
function THDPanel() {
  return (
    <motion.div
      className="absolute left-[2%] bottom-[22%] hidden lg:block z-20"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.4, duration: 1 }}
    >
      <motion.div
        className="glass-card p-4 w-44 xl:w-48 border border-foreground/10 shadow-xl shadow-cyan-500/5"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <span className="text-xs text-foreground/60 font-medium">THD+N @ 1kHz</span>
        <div className="flex items-baseline gap-1 mt-2">
          <span className="text-2xl xl:text-3xl font-bold text-cyan-400 font-mono">0.003</span>
          <span className="text-sm text-cyan-400/70">%</span>
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px]">
          <span className="text-foreground/50">Spec:</span>
          <span className="text-cyan-400">&lt;0.01%</span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-medium">PASS</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Animated grid lines
function AnimatedGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={`h-${i}`}
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"
          style={{ top: `${(i + 1) * 15}%` }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: i * 0.1, duration: 1.5 }}
        />
      ))}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={`v-${i}`}
          className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent"
          style={{ left: `${(i + 1) * 12}%` }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ delay: i * 0.05, duration: 1.5 }}
        />
      ))}
    </div>
  )
}

export function HeroSection() {
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [transformIndex, setTransformIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTransformIndex((prev) => (prev + 1) % transformations.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const currentTransform = transformations[transformIndex]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Screen overlay effect - makes it look like viewing through a monitor */}
      <ScreenOverlay />

      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-cyan-950/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,212,255,0.1),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,rgba(0,212,255,0.05),transparent)]" />

      <AnimatedGrid />

      {/* Floating data visualization panels */}
      <FrequencyResponseGraph />
      <YieldPanel />
      <ControlLimitsPanel />
      <THDPanel />

      {/* Main content */}
      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Logo and Platform Name */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-col items-center mb-6 sm:mb-8"
        >
          <motion.div
            className="relative mb-3 sm:mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Glow behind logo */}
            <div className="absolute inset-0 blur-3xl bg-cyan-500/30 rounded-full scale-150" />
            <Image
              src="/logo/logo-2-nobg.png"
              alt="Lyceum"
              width={140}
              height={140}
              className="relative z-10 drop-shadow-[0_0_30px_rgba(0,212,255,0.4)] w-24 sm:w-28 md:w-32 lg:w-36 h-auto object-contain"
              priority
            />
          </motion.div>
          <motion.h2
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <span className="text-gradient-cyan">Lyceum</span>
          </motion.h2>
        </motion.div>

        {/* Badge */}
        <motion.div
          variants={fadeInUp}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-yellow-500/10 border border-yellow-500/30 mb-6 sm:mb-8 backdrop-blur-sm shadow-lg shadow-yellow-500/10"
        >
          <Sparkle weight="fill" className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
          <span className="text-xs sm:text-sm font-medium text-yellow-400">
            The Future of Engineering Analytics
          </span>
          <Sparkle weight="fill" className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
        </motion.div>

        {/* Headline */}
        <motion.div variants={fadeInUp} className="mb-6 sm:mb-8">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1]">
            <span className="block text-foreground mb-2 sm:mb-4">Transform</span>
            <span className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 md:gap-6">
              <span className="relative inline-flex items-center justify-center min-w-[200px] sm:min-w-[280px] md:min-w-[320px] h-[1.2em]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`from-${transformIndex}`}
                    initial={{ y: 50, opacity: 0, filter: 'blur(10px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    exit={{ y: -50, opacity: 0, filter: 'blur(10px)' }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute text-foreground/30 line-through decoration-foreground/30 decoration-2 sm:decoration-4"
                  >
                    {currentTransform.from}
                  </motion.span>
                </AnimatePresence>
              </span>
              <motion.span
                className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-foreground/20 hidden sm:block"
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
              <span className="relative inline-flex items-center justify-center min-w-[200px] sm:min-w-[280px] md:min-w-[320px] h-[1.2em]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`to-${transformIndex}`}
                    initial={{ y: 50, opacity: 0, filter: 'blur(10px)', scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 }}
                    exit={{ y: -50, opacity: 0, filter: 'blur(10px)', scale: 0.8 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    className="absolute font-extrabold text-gradient-cyan"
                  >
                    {currentTransform.to}
                  </motion.span>
                </AnimatePresence>
              </span>
            </span>
          </h1>
        </motion.div>

        {/* Subheadline */}
        <motion.p
          variants={fadeInUp}
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-foreground/60 max-w-3xl mx-auto mb-8 sm:mb-10 leading-relaxed px-2"
        >
          The <span className="text-foreground font-semibold">command center</span> for measurement data.{' '}
          <span className="text-cyan-400">Ingest</span> from any equipment,{' '}
          <span className="text-cyan-400">analyze</span> in real-time, and{' '}
          <span className="text-cyan-400">ship better products</span>.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8"
        >
          <Link href="/auth/signup" className="group relative w-full sm:w-auto">
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-500 rounded-xl opacity-50 blur-lg group-hover:opacity-80 transition-opacity"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              style={{ backgroundSize: '200% 200%' }}
            />
            <div className="relative px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-semibold text-base sm:text-lg flex items-center justify-center gap-2 hover:from-cyan-400 hover:to-cyan-300 transition-all">
              Start Free Trial
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <button
            onClick={() => setVideoModalOpen(true)}
            className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-xl border border-foreground/20 text-foreground/80 font-semibold text-base sm:text-lg flex items-center justify-center gap-2 sm:gap-3 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all backdrop-blur-sm"
          >
            <motion.div
              className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-cyan-500/20 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
              <Play weight="fill" className="w-3 h-3 sm:w-4 sm:h-4 text-cyan-400 ml-0.5" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
            Watch Demo
          </button>
        </motion.div>

        {/* Trust indicators - Gold checkmarks for trust emphasis */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-2 sm:gap-y-3 text-xs sm:text-sm text-foreground/40"
        >
          {['30-day free trial', 'Setup in 5 minutes'].map((item, i) => (
            <motion.div
              key={item}
              className="flex items-center gap-1.5 sm:gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 + i * 0.1 }}
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{item}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <motion.div
          className="flex flex-col items-center gap-2 cursor-pointer"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="text-[10px] text-foreground/30 uppercase tracking-[0.2em]">Explore</span>
          <div className="w-5 h-8 rounded-full border border-foreground/20 flex items-start justify-center p-1.5">
            <motion.div
              className="w-1 h-2 rounded-full bg-cyan-400"
              animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </motion.div>

      <VideoModal isOpen={videoModalOpen} onClose={() => setVideoModalOpen(false)} />
    </section>
  )
}
