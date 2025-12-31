'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, Play, Sparkle } from '@phosphor-icons/react'
import { fadeInUp, staggerContainer } from '@/lib/animation-variants'
import { VideoModal } from './PlaceholderVideo'

// Rotating keywords for the tagline
const transformations = [
  { from: 'Chaos', to: 'Clarity', color: 'cyan' },
  { from: 'Spreadsheets', to: 'Insights', color: 'purple' },
  { from: 'Silos', to: 'Unity', color: 'cyan' },
  { from: 'Guesswork', to: 'Precision', color: 'purple' },
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

// Interactive star field that responds to mouse movement
function StarField({ mouseX, mouseY }: { mouseX: any; mouseY: any }) {
  const stars = useMemo(() => {
    const result = []
    // Create 150 stars spread across the viewport
    for (let i = 0; i < 150; i++) {
      result.push({
        id: i,
        // Position as percentage of viewport
        x: Math.random() * 100,
        y: Math.random() * 100,
        // Varying sizes - more larger stars
        size: Math.random() > 0.7 ? 4 + Math.random() * 4 : 2 + Math.random() * 3,
        // Opacity varies
        opacity: 0.2 + Math.random() * 0.6,
        // Movement sensitivity - how much this star moves with mouse
        sensitivity: 0.02 + Math.random() * 0.08,
        // Animation delay for twinkling
        delay: Math.random() * 3,
        // Color variation
        color: Math.random() > 0.8 ? 'purple' : Math.random() > 0.5 ? 'cyan' : 'white',
      })
    }
    return result
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => {
        // Transform star position based on mouse movement
        const starX = useTransform(mouseX, (x: number) => star.x + x * star.sensitivity)
        const starY = useTransform(mouseY, (y: number) => star.y + y * star.sensitivity)

        return (
          <motion.div
            key={star.id}
            className="absolute"
            style={{
              left: useTransform(starX, (x) => `${x}%`),
              top: useTransform(starY, (y) => `${y}%`),
            }}
          >
            <motion.div
              className={`rounded-full ${
                star.color === 'cyan'
                  ? 'bg-cyan-400'
                  : star.color === 'purple'
                  ? 'bg-purple-400'
                  : 'bg-white'
              }`}
              style={{
                width: star.size,
                height: star.size,
                opacity: star.opacity,
                boxShadow:
                  star.size > 4
                    ? `0 0 ${star.size * 2}px ${star.size / 2}px ${
                        star.color === 'cyan'
                          ? 'rgba(0,212,255,0.4)'
                          : star.color === 'purple'
                          ? 'rgba(139,92,246,0.4)'
                          : 'rgba(255,255,255,0.3)'
                      }`
                    : undefined,
              }}
              animate={{
                opacity: [star.opacity, star.opacity * 1.5, star.opacity],
                scale: [1, 1.2, 1],
              }}
              transition={{
                duration: 2 + star.delay,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: star.delay,
              }}
            />
          </motion.div>
        )
      })}
    </div>
  )
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
      className="absolute left-[5%] top-[18%] hidden xl:block z-20"
      initial={{ opacity: 0, x: -30, y: 20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: 0.8, duration: 1 }}
    >
      <motion.div
        className="glass-card p-3 w-60 border border-foreground/10 shadow-xl shadow-cyan-500/5"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-foreground/50">Frequency Response</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-0.5 bg-cyan-400" />
            <span className="text-[8px] text-cyan-400">Golden</span>
          </div>
        </div>
        <div className="relative h-16 bg-foreground/[0.02] rounded border border-foreground/5 overflow-hidden">
          <div className="absolute left-0 right-0 top-[20%] bottom-[20%] bg-green-500/5 border-y border-green-500/20" />
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
        <div className="flex justify-between mt-1.5 text-[8px] text-foreground/30">
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
      className="absolute right-[8%] top-[15%] hidden xl:block z-20"
      initial={{ opacity: 0, x: 30, y: -20 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ delay: 1, duration: 1 }}
    >
      <motion.div
        className="glass-card p-3 w-44 border border-foreground/10 shadow-xl shadow-cyan-500/5"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-foreground/50">Production Yield</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-3xl font-bold text-gradient-cyan font-mono">{animatedYield.toFixed(1)}</span>
          <span className="text-lg text-cyan-400">%</span>
        </div>
        <div className="mt-1.5 h-1.5 bg-foreground/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 to-green-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${animatedYield}%` }}
            transition={{ duration: 2, delay: 0.5 }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[8px] text-foreground/40">
          <span>1,247 passed</span>
          <span className="text-green-400">+2.1%↑</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Control Limits Panel - Floating position
function ControlLimitsPanel() {
  return (
    <motion.div
      className="absolute right-[3%] bottom-[28%] hidden xl:block z-20"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.2, duration: 1 }}
    >
      <motion.div
        className="glass-card p-3 w-40 border border-foreground/10 shadow-xl shadow-purple-500/5"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-foreground/50">Control Limits</span>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">Active</span>
        </div>
        <div className="space-y-1">
          {[
            { label: 'USL', value: '+3σ', color: 'text-red-400', bg: 'bg-red-400' },
            { label: 'Target', value: '0σ', color: 'text-green-400', bg: 'bg-green-400' },
            { label: 'LSL', value: '-3σ', color: 'text-red-400', bg: 'bg-red-400' },
          ].map((limit, i) => (
            <motion.div
              key={limit.label}
              className="flex items-center justify-between"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 + i * 0.1 }}
            >
              <div className="flex items-center gap-1.5">
                <div className={`w-1 h-1 rounded-full ${limit.bg}`} />
                <span className="text-[9px] text-foreground/60">{limit.label}</span>
              </div>
              <span className={`text-[9px] font-mono ${limit.color}`}>{limit.value}</span>
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
      className="absolute left-[3%] bottom-[25%] hidden xl:block z-20"
      initial={{ opacity: 0, x: -40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 1.4, duration: 1 }}
    >
      <motion.div
        className="glass-card p-3 w-36 border border-foreground/10 shadow-xl shadow-purple-500/5"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      >
        <span className="text-[10px] text-foreground/50">THD+N @ 1kHz</span>
        <div className="flex items-baseline gap-1 mt-1">
          <span className="text-xl font-bold text-purple-400 font-mono">0.003</span>
          <span className="text-xs text-purple-400/70">%</span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[8px]">
          <span className="text-foreground/40">Spec:</span>
          <span className="text-green-400">&lt;0.01%</span>
          <span className="px-1 py-0.5 rounded bg-green-500/20 text-green-400">PASS</span>
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
  const containerRef = useRef<HTMLDivElement>(null)

  // Mouse position for star field movement
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTransformIndex((prev) => (prev + 1) % transformations.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    // Calculate offset from center (normalized to -100 to 100 range)
    const normalizedX = ((e.clientX - centerX) / (rect.width / 2)) * 100
    const normalizedY = ((e.clientY - centerY) / (rect.height / 2)) * 100
    mouseX.set(normalizedX)
    mouseY.set(normalizedY)
  }

  const currentTransform = transformations[transformIndex]

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-cyan-950/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,212,255,0.1),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_80%_80%,rgba(139,92,246,0.08),transparent)]" />

      <AnimatedGrid />

      {/* Interactive star field */}
      <StarField mouseX={mouseX} mouseY={mouseY} />

      {/* Floating data visualization panels */}
      <FrequencyResponseGraph />
      <YieldPanel />
      <ControlLimitsPanel />
      <THDPanel />

      {/* Main content */}
      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        {/* Logo and Platform Name */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-col items-center mb-8"
        >
          <motion.div
            className="relative mb-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Glow behind logo */}
            <div className="absolute inset-0 blur-3xl bg-gradient-to-br from-cyan-500/30 to-purple-500/20 rounded-full scale-150" />
            <Image
              src="/logo/logo-2-nobg.png"
              alt="Lyceum"
              width={120}
              height={120}
              className="relative z-10 drop-shadow-[0_0_30px_rgba(0,212,255,0.4)]"
              priority
            />
          </motion.div>
          <motion.h2
            className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 mb-8 backdrop-blur-sm"
        >
          <Sparkle weight="fill" className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            The Future of Engineering Analytics
          </span>
          <Sparkle weight="fill" className="w-4 h-4 text-purple-400" />
        </motion.div>

        {/* Headline */}
        <motion.div variants={fadeInUp} className="mb-8">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.1]">
            <span className="block text-foreground mb-4">Transform</span>
            <span className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              <span className="relative inline-flex items-center justify-center min-w-[280px] sm:min-w-[320px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`from-${transformIndex}`}
                    initial={{ y: 50, opacity: 0, filter: 'blur(10px)' }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                    exit={{ y: -50, opacity: 0, filter: 'blur(10px)' }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute text-foreground/30 line-through decoration-red-500/50 decoration-4"
                  >
                    {currentTransform.from}
                  </motion.span>
                </AnimatePresence>
              </span>
              <motion.span
                className="text-4xl sm:text-5xl md:text-6xl text-foreground/20"
                animate={{ x: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
              <span className="relative inline-flex items-center justify-center min-w-[280px] sm:min-w-[320px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={`to-${transformIndex}`}
                    initial={{ y: 50, opacity: 0, filter: 'blur(10px)', scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 }}
                    exit={{ y: -50, opacity: 0, filter: 'blur(10px)', scale: 0.8 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                    className={`absolute font-extrabold ${
                      currentTransform.color === 'cyan'
                        ? 'text-gradient-cyan'
                        : 'bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent'
                    }`}
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
          className="text-lg sm:text-xl md:text-2xl text-foreground/60 max-w-3xl mx-auto mb-10 leading-relaxed"
        >
          The <span className="text-foreground font-semibold">command center</span> for measurement data.{' '}
          <span className="text-cyan-400">Ingest</span> from any equipment,{' '}
          <span className="text-purple-400">analyze</span> in real-time, and{' '}
          <span className="text-green-400">ship better products</span>.
        </motion.p>

        {/* CTAs */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8"
        >
          <Link href="/auth/signup" className="group relative">
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-cyan-400 to-purple-500 rounded-xl opacity-50 blur-lg group-hover:opacity-80 transition-opacity"
              animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              style={{ backgroundSize: '200% 200%' }}
            />
            <div className="relative px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-semibold text-lg flex items-center gap-2 hover:from-cyan-400 hover:to-cyan-300 transition-all">
              Start Free Trial
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
          <button
            onClick={() => setVideoModalOpen(true)}
            className="group px-8 py-4 rounded-xl border border-foreground/20 text-foreground/80 font-semibold text-lg flex items-center gap-3 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all backdrop-blur-sm"
          >
            <motion.div
              className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
            >
              <Play weight="fill" className="w-4 h-4 text-cyan-400 ml-0.5" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-cyan-400/50"
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>
            Watch Demo
          </button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div
          variants={fadeInUp}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-foreground/40"
        >
          {['30-day free trial', 'Setup in 5 minutes'].map((item, i) => (
            <motion.div
              key={item}
              className="flex items-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 + i * 0.1 }}
            >
              <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
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
