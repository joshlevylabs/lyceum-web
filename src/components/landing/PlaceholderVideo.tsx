'use client'

import { Play } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface PlaceholderVideoProps {
  aspectRatio?: string
  label?: string
  className?: string
  onClick?: () => void
}

export function PlaceholderVideo({
  aspectRatio = '16/9',
  label = 'Product Demo Video',
  className = '',
  onClick
}: PlaceholderVideoProps) {
  return (
    <div
      className={`glass-card flex items-center justify-center bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 cursor-pointer group overflow-hidden ${className}`}
      style={{ aspectRatio }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.15)_0%,transparent_70%)]" />
      </div>

      {/* Play button */}
      <motion.button
        className="relative flex flex-col items-center gap-4"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="w-20 h-20 rounded-full bg-cyan-500/20 flex items-center justify-center glow-cyan group-hover:glow-cyan-strong transition-all duration-300">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg">
            <Play weight="fill" className="w-8 h-8 text-black ml-1" />
          </div>
        </div>
        <span className="text-foreground/60 text-sm font-medium group-hover:text-foreground/80 transition-colors">
          {label}
        </span>
      </motion.button>

      {/* Duration badge */}
      <div className="absolute bottom-4 right-4 px-2 py-1 rounded bg-black/50 text-white/70 text-xs font-mono">
        2:45
      </div>
    </div>
  )
}

// Video modal wrapper (for when video is clicked)
interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl?: string
}

export function VideoModal({ isOpen, onClose, videoUrl }: VideoModalProps) {
  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-4xl aspect-video glass-card overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {videoUrl ? (
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-purple-500/10">
            <div className="text-center">
              <Play className="w-16 h-16 text-foreground/30 mx-auto mb-3" />
              <p className="text-foreground/50">Video placeholder</p>
              <p className="text-foreground/30 text-sm mt-1">Replace with actual video URL</p>
            </div>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/70 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </motion.div>
    </motion.div>
  )
}
