'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Flask,
  Broadcast,
  Cpu,
  Lightning,
  Television,
  HardDrives,
  Clock,
  ArrowRight,
  Plus
} from '@phosphor-icons/react'
import { plugins, pluginTierLabels, pluginTierColors, morePluginsComingSoon, type Plugin } from '@/data/landing'
import { fadeInUp, staggerContainerFast, cardHover, badgePop } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BeakerIcon: Flask,
  SignalIcon: Broadcast,
  CpuChipIcon: Cpu,
  BoltIcon: Lightning,
  TvIcon: Television,
  ServerIcon: HardDrives,
  ClockIcon: Clock
}

function PluginCard({ plugin }: { plugin: Plugin }) {
  const Icon = iconMap[plugin.icon] || Flask
  const tierColor = pluginTierColors[plugin.tier]

  return (
    <motion.div
      variants={fadeInUp}
      whileHover="hover"
      initial="rest"
    >
      <motion.div
        variants={cardHover}
        className="glass-card p-6 h-full relative overflow-hidden group"
      >
        {/* Badges */}
        <div className="absolute top-4 right-4 flex gap-2">
          {plugin.isNew && (
            <motion.span
              variants={badgePop}
              className="px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold"
            >
              New
            </motion.span>
          )}
          {plugin.isFeatured && (
            <motion.span
              variants={badgePop}
              className="px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-semibold"
            >
              Featured
            </motion.span>
          )}
        </div>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Icon className="w-6 h-6 text-cyan-400" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-foreground mb-2">
          {plugin.name}
        </h3>
        <p className="text-sm text-foreground/60 mb-4 line-clamp-2">
          {plugin.shortDescription}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-foreground/10">
          <span className={`px-2 py-1 rounded text-xs font-medium ${tierColor} text-white`}>
            {pluginTierLabels[plugin.tier]}
          </span>
          <span className="text-xs text-foreground/40">
            v{plugin.version}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

function MoreComingCard() {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover="hover"
      initial="rest"
    >
      <motion.div
        variants={cardHover}
        className="glass-card p-6 h-full relative overflow-hidden group border-dashed border-2 border-foreground/20 flex flex-col items-center justify-center text-center min-h-[200px]"
      >
        {/* Icon */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
          <Plus className="w-6 h-6 text-foreground/40" />
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold text-foreground/60 mb-2">
          ...and more coming!
        </h3>
        <p className="text-sm text-foreground/40">
          We&apos;re constantly adding new hardware integrations
        </p>
      </motion.div>
    </motion.div>
  )
}

export function PluginShowcase() {
  return (
    <SectionWrapper id="plugins" className="py-24 bg-foreground/[0.02]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          variants={staggerContainerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.p variants={fadeInUp} className="text-cyan-400 font-semibold mb-4">
            Hardware Integrations
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Connect Your Test Equipment
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Seamlessly integrate with industry-leading test and measurement equipment. Automate data collection and streamline your testing workflow.
          </motion.p>
        </motion.div>

        {/* Plugin grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          variants={staggerContainerFast}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {plugins.map((plugin) => (
            <PluginCard key={plugin.id} plugin={plugin} />
          ))}
          {morePluginsComingSoon && <MoreComingCard />}
        </motion.div>

        {/* CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Link
            href="/plugins"
            className="btn-ghost inline-flex items-center gap-2 group"
          >
            Explore All Plugins
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
