'use client'

// Screen overlay effect - makes content look like it's viewed through a monitor
export function ScreenOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden rounded-lg">
      {/* Subtle scan lines */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* CRT-style vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.15) 80%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Subtle screen glare */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.05) 100%)',
        }}
      />

      {/* Corner bezels - subtle rounded corners effect */}
      <div className="absolute top-0 left-0 w-16 h-16 bg-gradient-to-br from-black/20 to-transparent rounded-tl-2xl" />
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-black/20 to-transparent rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-black/20 to-transparent rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 w-16 h-16 bg-gradient-to-tl from-black/20 to-transparent rounded-br-2xl" />

      {/* Subtle RGB pixel effect on edges */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(90deg,
              rgba(255,0,0,0.5) 0px, transparent 1px,
              rgba(0,255,0,0.5) 1px, transparent 2px,
              rgba(0,0,255,0.5) 2px, transparent 3px
            )
          `,
          backgroundSize: '3px 100%',
        }}
      />

      {/* Screen border glow */}
      <div
        className="absolute inset-0 border border-cyan-500/10 rounded-lg"
        style={{
          boxShadow: 'inset 0 0 60px rgba(0,212,255,0.03), inset 0 0 120px rgba(0,0,0,0.1)',
        }}
      />
    </div>
  )
}
