'use client'

import { motion } from 'framer-motion'
import {
  PresentationChart,
  Table,
  ChartBar,
  Cloud,
  ShieldCheck,
  UsersThree
} from '@phosphor-icons/react'
import { features } from '@/data/landing'
import { fadeInUp, staggerContainer, slideInLeft, slideInRight } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  PresentationChartLineIcon: PresentationChart,
  TableCellsIcon: Table,
  ChartBarIcon: ChartBar,
  CloudIcon: Cloud,
  ShieldCheckIcon: ShieldCheck,
  UserGroupIcon: UsersThree
}

export function FeaturesDeepDive() {
  return (
    <SectionWrapper id="features" className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-20"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.p variants={fadeInUp} className="text-cyan-400 font-semibold mb-4">
            Complete Feature Set
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Everything You Need for Industrial Analytics
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            A comprehensive platform designed by engineers, for engineers. Every feature is built with your workflow in mind.
          </motion.p>
        </motion.div>

        {/* Feature list - alternating layout */}
        <div className="space-y-24">
          {features.map((feature, index) => {
            const Icon = iconMap[feature.icon] || ChartBar
            const isEven = index % 2 === 0

            return (
              <motion.div
                key={feature.id}
                className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-16`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: '-100px' }}
              >
                {/* Content side */}
                <motion.div
                  className="flex-1"
                  variants={isEven ? slideInLeft : slideInRight}
                >
                  <div className="max-w-lg">
                    {/* Icon and title */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-cyan-400" />
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
                        {feature.name}
                      </h3>
                    </div>

                    {/* Description */}
                    <p className="text-foreground/60 text-lg mb-8 leading-relaxed">
                      {feature.description}
                    </p>

                    {/* Highlights */}
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {feature.highlights.map((highlight, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3.5 h-3.5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <span className="text-foreground/70">{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>

                {/* Visual side - video */}
                <motion.div
                  className="flex-1 w-full"
                  variants={isEven ? slideInRight : slideInLeft}
                >
                  <div className="relative">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-3xl opacity-30 scale-90" />

                    {/* Feature video */}
                    <div className="relative glass-card aspect-[4/3] overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-purple-500/5" />
                      {feature.video ? (
                        <video
                          className="w-full h-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                        >
                          <source src={feature.video} type="video/mp4" />
                        </video>
                      ) : (
                        <div className="flex items-center justify-center h-full text-center z-10">
                          <Icon className="w-20 h-20 text-foreground/10 mx-auto mb-4" />
                          <p className="text-foreground/30 text-sm">Feature illustration</p>
                          <p className="text-foreground/20 text-xs mt-1">{feature.name}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </SectionWrapper>
  )
}
