'use client'

interface LyceumLogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  className?: string
}

export function LyceumLogo({ size = 'md', showText = true, className = '' }: LyceumLogoProps) {
  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  }

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  }

  return (
    <div className={`flex items-center ${className}`}>
      {/* Modern Stylized L Logo */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            {/* Main gradient */}
            <linearGradient id="lyceumGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d4ff" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            {/* Glow effect */}
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background rounded square */}
          <rect
            x="2"
            y="2"
            width="28"
            height="28"
            rx="6"
            fill="url(#lyceumGradient)"
            opacity="0.15"
          />

          {/* Main L shape - bold and modern */}
          <g filter="url(#logoGlow)">
            {/* Vertical bar */}
            <rect
              x="8"
              y="6"
              width="5"
              height="20"
              rx="2"
              fill="url(#lyceumGradient)"
            />
            {/* Horizontal bar */}
            <rect
              x="8"
              y="21"
              width="16"
              height="5"
              rx="2"
              fill="url(#lyceumGradient)"
            />
          </g>

          {/* Accent - small floating element */}
          <rect
            x="20"
            y="6"
            width="4"
            height="4"
            rx="1"
            fill="#00d4ff"
            opacity="0.6"
          />
        </svg>
      </div>

      {/* Text */}
      {showText && (
        <span className={`ml-3 ${textSizeClasses[size]} font-bold text-gradient-cyan tracking-tight`}>
          Lyceum
        </span>
      )}
    </div>
  )
}

export default LyceumLogo
