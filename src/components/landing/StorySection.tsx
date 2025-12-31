'use client'

import { motion } from 'framer-motion'
import { Users, Target, Lightbulb, Heart, Buildings } from '@phosphor-icons/react'
import { fadeInUp, staggerContainer, slideInLeft, slideInRight } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'
import { companyLogos } from '@/data/landing'

const values = [
  {
    icon: Target,
    title: 'Engineer-First Design',
    description: 'Every feature is built by engineers, for engineers. We understand your workflow because we live it.'
  },
  {
    icon: Lightbulb,
    title: 'Data Liberation',
    description: 'Your measurement data should work for you, not against you. We break down silos and unify your analytics.'
  },
  {
    icon: Heart,
    title: 'Crafted with Care',
    description: 'We obsess over the details—from millisecond response times to intuitive interfaces that just make sense.'
  }
]

export function StorySection() {
  return (
    <SectionWrapper id="story" className="py-24">
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
            Our Story
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Why We Built Lyceum
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Born from frustration, built with purpose. This is the story of how Lyceum came to be.
          </motion.p>
        </motion.div>

        {/* Main story content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-20">
          {/* Left: Story text */}
          <motion.div
            variants={slideInLeft}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="space-y-6"
          >
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">The Problem We Lived</h3>
              <div className="space-y-4 text-foreground/70 leading-relaxed">
                <p>
                  We've been there—sitting in front of five different software applications, trying to piece together
                  test data from a Klippel analyzer, an Audio Precision APx500, and three different DAQ systems.
                  Hours spent reformatting Excel files. Days lost searching for that one measurement from last month's
                  prototype test.
                </p>
                <p>
                  As engineers working in audio and electronics manufacturing, we saw the same story play out across
                  every company we worked with: brilliant engineers spending more time wrestling with data than
                  actually analyzing it. Critical insights buried in folders no one could find. Quality issues
                  discovered weeks after products shipped.
                </p>
                <p>
                  We knew there had to be a better way.
                </p>
              </div>
            </div>

            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-foreground mb-4">The Solution We Built</h3>
              <div className="space-y-4 text-foreground/70 leading-relaxed">
                <p>
                  Lyceum started as an internal tool—a way to unify our own measurement data and stop the madness.
                  We built direct integrations with the equipment we used every day. We designed the interface we
                  wished we had. We obsessed over making complex analysis feel effortless.
                </p>
                <p>
                  Word spread. Colleagues asked for access. Other companies wanted in. That's when we realized
                  this wasn't just our problem—it was an industry-wide pain point hiding in plain sight.
                </p>
                <p>
                  Today, Lyceum is used by engineering teams around the world, from boutique audio companies to
                  Fortune 500 manufacturers. But our mission remains the same: give engineers superpowers with
                  their measurement data.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right: Team visual and stats */}
          <motion.div
            variants={slideInRight}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="space-y-8"
          >
            {/* Team placeholder */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 blur-3xl opacity-30 scale-90" />
              <div className="relative glass-card aspect-[4/3] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                  <Users className="w-20 h-20 text-foreground/20 mb-4" />
                  <p className="text-foreground/40 text-sm mb-2">The Lyceum Team</p>
                  <p className="text-foreground/30 text-xs">Engineers building for engineers</p>
                </div>
              </div>
            </div>

            {/* Trusted by */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Buildings className="w-5 h-5 text-cyan-400" />
                <p className="text-sm font-semibold text-foreground">Trusted by engineers at</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {companyLogos.map((company) => (
                  <div
                    key={company.id}
                    className="px-4 py-3 rounded-lg bg-foreground/5 text-center"
                  >
                    <p className="font-medium text-foreground/70">{company.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Values */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {values.map((value) => {
            const Icon = value.icon
            return (
              <motion.div
                key={value.title}
                variants={fadeInUp}
                className="glass-card p-8 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mx-auto mb-6">
                  <Icon className="w-7 h-7 text-cyan-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">{value.title}</h3>
                <p className="text-foreground/60 leading-relaxed">{value.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
