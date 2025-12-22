'use client'

import { Image } from '@phosphor-icons/react'

interface PlaceholderImageProps {
  width?: number | string
  height?: number | string
  label?: string
  className?: string
  aspectRatio?: string
}

export function PlaceholderImage({
  width,
  height,
  label = 'Screenshot',
  className = '',
  aspectRatio
}: PlaceholderImageProps) {
  const style: React.CSSProperties = {
    width: width ?? '100%',
    height: height ?? 'auto',
    aspectRatio: aspectRatio ?? (typeof height === 'undefined' ? '16/9' : undefined)
  }

  return (
    <div
      className={`glass-card flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-purple-500/10 overflow-hidden ${className}`}
      style={style}
    >
      <div className="text-center p-6">
        <Image className="w-16 h-16 text-foreground/20 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground/40">{label}</p>
        {(width || height) && (
          <p className="text-xs text-foreground/25 mt-1">
            {width && height ? `${width} x ${height}` : 'Responsive'}
          </p>
        )}
      </div>
    </div>
  )
}

// Browser mockup wrapper for screenshot placeholders
interface BrowserMockupProps {
  children: React.ReactNode
  url?: string
  className?: string
}

export function BrowserMockup({
  children,
  url = 'app.lyceum.io/dashboard',
  className = ''
}: BrowserMockupProps) {
  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-black/20 border-b border-white/10">
        {/* Window controls */}
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        {/* URL bar */}
        <div className="flex-1 mx-4">
          <div className="bg-black/30 rounded-md px-3 py-1.5 text-xs text-foreground/50 font-mono">
            {url}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="bg-background/50">
        {children}
      </div>
    </div>
  )
}
