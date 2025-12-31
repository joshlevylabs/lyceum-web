'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChartBar,
  ChartLine,
  Factory,
  Gear,
  TestTube,
  MagnifyingGlass,
  Play
} from '@phosphor-icons/react'
import { userStories } from '@/data/landing'
import { fadeInUp, staggerContainer } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'

// Role to icon mapping
const roleIconMap: Record<string, React.ComponentType<{ className?: string; weight?: string }>> = {
  'QC Engineer': TestTube,
  'Production Manager': Factory,
  'Design Engineer': Gear,
  'Test Engineer': ChartLine,
  'Quality Manager': MagnifyingGlass
}

export function ProductOverview() {
  const [selectedStoryId, setSelectedStoryId] = useState(userStories[0]?.id || '')

  const selectedStory = userStories.find(s => s.id === selectedStoryId) || userStories[0]
  const SelectedIcon = selectedStory ? roleIconMap[selectedStory.role] || ChartBar : ChartBar

  return (
    <SectionWrapper id="solutions" className="py-24 overflow-hidden">
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
            Real-World Workflows
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Explore our Solutions
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            See how engineers use Lyceum to automate their daily workflows. Watch real sequences that ingest data, create visualizations, calculate control limits, and produce yield metrics.
          </motion.p>
        </motion.div>

        {/* User story menu and video player */}
        <motion.div
          className="flex flex-col lg:flex-row gap-8"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Left side: User story menu */}
          <div className="lg:w-1/3 space-y-2">
            {userStories.map((story) => {
              const Icon = roleIconMap[story.role] || ChartBar
              const isSelected = story.id === selectedStoryId

              return (
                <motion.button
                  key={story.id}
                  onClick={() => setSelectedStoryId(story.id)}
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
                      <div className={`text-xs font-medium mb-1 ${isSelected ? 'text-cyan-400/70' : 'text-foreground/40'}`}>
                        {story.role}
                      </div>
                      <h3 className={`font-semibold mb-1 transition-colors ${
                        isSelected ? 'text-cyan-400' : 'text-foreground'
                      }`}>
                        {story.title}
                      </h3>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>

          {/* Right side: Video player and story details */}
          <div className="lg:w-2/3">
            <div className="relative">
              {/* Glow effect - cyan to gold gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-yellow-500/20 to-cyan-500/20 blur-3xl opacity-30 scale-95" />

              {/* Video container */}
              <div className="relative glass-card overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedStoryId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="aspect-video"
                  >
                    {selectedStory?.video ? (
                      <video
                        key={selectedStory.video}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                      >
                        <source src={selectedStory.video} type="video/mp4" />
                      </video>
                    ) : (
                      /* Placeholder when no video */
                      <div className="w-full h-full bg-gradient-to-br from-cyan-500/10 to-yellow-500/10 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mb-4">
                          <Play className="w-10 h-10 text-foreground/30" weight="fill" />
                        </div>
                        <SelectedIcon className="w-16 h-16 text-foreground/10 mb-4" />
                        <p className="text-foreground/40 text-sm">Workflow recording coming soon</p>
                        <p className="text-foreground/30 text-xs mt-1">{selectedStory?.title}</p>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Video info overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center gap-3">
                    <SelectedIcon className="w-6 h-6 text-cyan-400" />
                    <div>
                      <div className="text-xs text-white/50 mb-0.5">{selectedStory?.role}</div>
                      <h4 className="font-semibold text-white">{selectedStory?.title}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scenario quote */}
            <motion.div
              className="mt-6 p-4 border-l-2 border-cyan-500/30 bg-foreground/5 rounded-r-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-foreground/50 italic">
                "{selectedStory?.scenario}"
              </p>
            </motion.div>

            {/* Description */}
            <motion.p
              className="mt-4 text-foreground/60 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.25 }}
            >
              {selectedStory?.description}
            </motion.p>

            {/* Workflow steps */}
            <motion.div
              className="mt-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-foreground/40 text-sm uppercase tracking-wider font-semibold mb-4">
                Automated Workflow
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedStory?.workflow.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center flex-shrink-0">
                      <span className="text-cyan-400 text-sm font-bold">{index + 1}</span>
                    </div>
                    <span className="text-foreground/70 text-sm">{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
