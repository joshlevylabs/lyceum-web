'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Flask,
  Broadcast,
  Lightbulb,
  Buildings,
  ArrowRight
} from '@phosphor-icons/react'
import { useCases, type UseCase } from '@/data/landing/useCases'
import { fadeInUp, staggerContainer, cardHover } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'
import { UseCaseModal } from './UseCaseModal'

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BeakerIcon: Flask,
  SignalIcon: Broadcast,
  LightBulbIcon: Lightbulb,
  BuildingOffice2Icon: Buildings
}

export function UseCasesSection() {
  const [selectedUseCase, setSelectedUseCase] = useState<UseCase | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCardClick = (useCase: UseCase) => {
    setSelectedUseCase(useCase)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <SectionWrapper id="use-cases" className="py-24">
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
            Industry Solutions
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Built for Your Industry
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            From manufacturing floors to research labs, Lyceum adapts to your specific workflow and requirements. Click any card to see a real-world example.
          </motion.p>
        </motion.div>

        {/* Use case cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {useCases.map((useCase) => {
            const Icon = iconMap[useCase.icon] || Flask
            return (
              <motion.div
                key={useCase.id}
                variants={fadeInUp}
                whileHover="hover"
                initial="rest"
              >
                <motion.div
                  variants={cardHover}
                  className="glass-card p-8 h-full cursor-pointer group"
                  onClick={() => handleCardClick(useCase)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleCardClick(useCase)}
                >
                  {/* Header */}
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center flex-shrink-0 group-hover:from-cyan-500/30 group-hover:to-cyan-500/10 transition-colors">
                      <Icon className="w-7 h-7 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1 group-hover:text-cyan-400 transition-colors">
                        {useCase.title}
                      </h3>
                      <p className="text-sm text-cyan-400 font-medium">
                        {useCase.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-foreground/60 mb-6 leading-relaxed">
                    {useCase.description}
                  </p>

                  {/* Benefits - Gold checkmarks for trust emphasis */}
                  <ul className="space-y-2 mb-6">
                    {useCase.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-3 text-sm text-foreground/70">
                        <svg className="w-4 h-4 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  {/* Click indicator */}
                  <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>See real-world example</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>

                  {/* Related plugins badge */}
                  {useCase.relatedPlugins.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-foreground/10">
                      <p className="text-xs text-foreground/40 mb-2">Related plugins:</p>
                      <div className="flex flex-wrap gap-2">
                        {useCase.relatedPlugins.map((plugin) => (
                          <span
                            key={plugin}
                            className="px-2 py-1 rounded-md bg-foreground/5 text-xs text-foreground/50"
                          >
                            {plugin}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Modal */}
      <UseCaseModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        useCase={selectedUseCase}
        icon={selectedUseCase ? iconMap[selectedUseCase.icon] || Flask : Flask}
      />
    </SectionWrapper>
  )
}
