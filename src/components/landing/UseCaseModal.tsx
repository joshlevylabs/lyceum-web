'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Play, ArrowRight } from '@phosphor-icons/react'
import type { UseCase } from '@/data/landing/useCases'

interface UseCaseModalProps {
  isOpen: boolean
  onClose: () => void
  useCase: UseCase | null
  icon: React.ComponentType<{ className?: string }>
}

export function UseCaseModal({ isOpen, onClose, useCase, icon: Icon }: UseCaseModalProps) {
  if (!useCase) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center p-4 py-8 bg-black/80 backdrop-blur-sm overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-4xl glass-card overflow-hidden flex flex-col max-h-[calc(100vh-4rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative p-4 sm:p-8 pb-4 sm:pb-6 border-b border-foreground/10 flex-shrink-0">
              {/* Background gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/5" />

              <div className="relative flex items-start gap-4 sm:gap-6 pr-10">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-500/30 to-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-cyan-400 text-xs sm:text-sm font-semibold mb-1">{useCase.subtitle}</p>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground leading-tight">{useCase.title}</h2>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-foreground/10 flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-foreground/20 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1">
              {/* Video placeholder */}
              <div className="aspect-video max-h-[40vh] rounded-xl overflow-hidden mb-6 sm:mb-8 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 flex items-center justify-center border border-foreground/10">
                <div className="text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4 cursor-pointer hover:bg-cyan-500/30 transition-colors">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg">
                      <Play weight="fill" className="w-6 h-6 sm:w-8 sm:h-8 text-black ml-1" />
                    </div>
                  </div>
                  <p className="text-foreground/50 text-xs sm:text-sm">Watch the {useCase.title} walkthrough</p>
                  <p className="text-foreground/30 text-xs mt-1">Video coming soon</p>
                </div>
              </div>

              {/* Detailed story */}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Real-World Application</h3>
                {useCase.detailedStory ? (
                  <div className="space-y-4 text-foreground/70 leading-relaxed">
                    {useCase.detailedStory.split('\n\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-foreground/70 leading-relaxed">{useCase.description}</p>
                )}
              </div>

              {/* Outcomes */}
              {useCase.outcomes && useCase.outcomes.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Key Outcomes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {useCase.outcomes.map((outcome, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-foreground/5"
                      >
                        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="text-foreground/80 text-sm">{outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Benefits */}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Key Benefits</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {useCase.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-foreground/70">
                      <svg className="w-5 h-5 text-cyan-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Related plugins */}
              {useCase.relatedPlugins.length > 0 && (
                <div className="mb-6 sm:mb-8 p-3 sm:p-4 rounded-xl bg-foreground/5 border border-foreground/10">
                  <p className="text-sm text-foreground/50 mb-2">Recommended plugins for this use case:</p>
                  <div className="flex flex-wrap gap-2">
                    {useCase.relatedPlugins.map((plugin) => (
                      <span
                        key={plugin}
                        className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-sm font-medium"
                      >
                        {plugin}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all flex items-center justify-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-6 py-3 rounded-xl border border-foreground/20 text-foreground/70 font-semibold hover:bg-foreground/5 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
