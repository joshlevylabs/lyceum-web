'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, imageReveal } from '@/lib/animation-variants'
import { BrowserMockup, PlaceholderImage } from './PlaceholderImage'
import { PlaceholderVideo, VideoModal } from './PlaceholderVideo'
import { SectionWrapper } from './SectionWrapper'

// Feature callout positions for the screenshot
const featureCallouts = [
  { id: 1, label: 'Real-time Charts', position: { top: '20%', left: '10%' } },
  { id: 2, label: 'Data Filters', position: { top: '15%', right: '15%' } },
  { id: 3, label: 'Team Collaboration', position: { bottom: '30%', left: '20%' } },
  { id: 4, label: 'Export Options', position: { bottom: '25%', right: '10%' } }
]

export function ProductOverview() {
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [activeView, setActiveView] = useState<'screenshot' | 'video'>('screenshot')

  return (
    <SectionWrapper id="product" className="py-24 overflow-hidden">
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
            See It In Action
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Powerful Analytics at Your Fingertips
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Experience the intuitive interface designed for engineers who demand precision and speed in their data analysis workflow.
          </motion.p>
        </motion.div>

        {/* View toggle */}
        <motion.div
          className="flex justify-center gap-2 mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <button
            onClick={() => setActiveView('screenshot')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'screenshot'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            Screenshot
          </button>
          <button
            onClick={() => setActiveView('video')}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
              activeView === 'video'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-foreground/50 hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            Video Demo
          </button>
        </motion.div>

        {/* Product showcase */}
        <motion.div
          className="relative"
          variants={imageReveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {/* Glow effect behind the browser */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 blur-3xl opacity-30 scale-95" />

          {activeView === 'screenshot' ? (
            <div className="relative">
              <BrowserMockup className="shadow-2xl shadow-cyan-500/10">
                <PlaceholderImage
                  label="Lyceum Dashboard Screenshot"
                  aspectRatio="16/9"
                  className="rounded-none"
                />
              </BrowserMockup>

              {/* Feature callouts */}
              {featureCallouts.map((callout, index) => (
                <motion.div
                  key={callout.id}
                  className="absolute hidden lg:block"
                  style={callout.position}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <div className="glass-card px-3 py-2 text-xs font-medium text-foreground/80 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    {callout.label}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/10">
              <PlaceholderVideo
                aspectRatio="16/9"
                label="Watch Product Demo"
                onClick={() => setVideoModalOpen(true)}
              />
            </div>
          )}
        </motion.div>

        {/* Feature highlights below */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {[
            { title: 'Lightning Fast', description: 'Process millions of data points in seconds' },
            { title: 'Intuitive Design', description: 'No training needed - just start analyzing' },
            { title: 'Cloud Native', description: 'Access your data from anywhere, anytime' }
          ].map((item) => (
            <motion.div
              key={item.title}
              variants={fadeInUp}
              className="text-center p-6 rounded-xl bg-foreground/5 hover:bg-foreground/10 transition-colors"
            >
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-foreground/50">{item.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <VideoModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
      />
    </SectionWrapper>
  )
}
