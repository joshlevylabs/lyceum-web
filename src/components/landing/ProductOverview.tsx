'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PresentationChart,
  Table,
  ChartBar,
  Cloud,
  ShieldCheck,
  Queue,
  Play
} from '@phosphor-icons/react'
import { features } from '@/data/landing'
import { fadeInUp, staggerContainer } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'

// Icon mapping (same as FeaturesDeepDive)
const iconMap: Record<string, React.ComponentType<{ className?: string; weight?: string }>> = {
  PresentationChartLineIcon: PresentationChart,
  TableCellsIcon: Table,
  ChartBarIcon: ChartBar,
  CloudIcon: Cloud,
  ShieldCheckIcon: ShieldCheck,
  QueueIcon: Queue
}

export function ProductOverview() {
  const [selectedFeatureId, setSelectedFeatureId] = useState(features[0]?.id || '')

  const selectedFeature = features.find(f => f.id === selectedFeatureId) || features[0]
  const SelectedIcon = selectedFeature ? iconMap[selectedFeature.icon] || ChartBar : ChartBar

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
            Explore Our Features
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Select a feature to watch a walkthrough video and see how Lyceum can transform your analytics workflow.
          </motion.p>
        </motion.div>

        {/* Feature menu and video player */}
        <motion.div
          className="flex flex-col lg:flex-row gap-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Left side: Feature menu */}
          <div className="lg:w-1/3 space-y-2">
            {features.map((feature) => {
              const Icon = iconMap[feature.icon] || ChartBar
              const isSelected = feature.id === selectedFeatureId

              return (
                <motion.button
                  key={feature.id}
                  onClick={() => setSelectedFeatureId(feature.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all duration-300 group ${
                    isSelected
                      ? 'bg-cyan-500/20 border border-cyan-500/30'
                      : 'bg-foreground/5 hover:bg-foreground/10 border border-transparent'
                  }`}
                  whileHover={{ x: isSelected ? 0 : 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/30'
                        : 'bg-foreground/10 group-hover:bg-foreground/15'
                    }`}>
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-cyan-400' : 'text-foreground/50'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold mb-1 transition-colors ${
                        isSelected ? 'text-cyan-400' : 'text-foreground'
                      }`}>
                        {feature.name}
                      </h3>
                      <p className="text-sm text-foreground/50 line-clamp-2">
                        {feature.shortDescription}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Right side: Video player */}
          <div className="lg:w-2/3">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-cyan-500/20 blur-3xl opacity-30 scale-95" />

              {/* Video container */}
              <div className="relative glass-card overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedFeatureId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="aspect-video"
                  >
                    {selectedFeature?.video ? (
                      <video
                        key={selectedFeature.video}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      >
                        <source src={selectedFeature.video} type="video/mp4" />
                      </video>
                    ) : (
                      /* Placeholder when no video */
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mb-4">
                          <Play className="w-10 h-10 text-foreground/30" weight="fill" />
                        </div>
                        <SelectedIcon className="w-16 h-16 text-foreground/10 mb-4" />
                        <p className="text-foreground/40 text-sm">Video coming soon</p>
                        <p className="text-foreground/30 text-xs mt-1">{selectedFeature?.name}</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Video info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-3">
                    <SelectedIcon className="w-6 h-6 text-cyan-400" />
                    <div>
                      <h4 className="font-semibold text-white">{selectedFeature?.name}</h4>
                      <p className="text-sm text-white/60">{selectedFeature?.shortDescription}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature highlights */}
            <motion.div
              className="grid grid-cols-2 gap-4 mt-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              {selectedFeature?.highlights.slice(0, 4).map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-foreground/60"
                >
                  <svg className="w-4 h-4 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {highlight}
                </div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
