'use client'

import Image from 'next/image'

interface LyceumLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
}

export function LyceumLogo({ size = 'md', showText = true, className = '' }: LyceumLogoProps) {
  const sizeMap = {
    sm: { logo: 28, text: 'text-lg' },
    md: { logo: 36, text: 'text-xl' },
    lg: { logo: 48, text: 'text-2xl' },
    xl: { logo: 64, text: 'text-3xl' },
  }

  const { logo: logoSize, text: textClass } = sizeMap[size]

  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo/logo-2-nobg.png"
        alt="Lyceum"
        width={logoSize}
        height={logoSize}
        className="object-contain"
        style={{ width: logoSize, height: 'auto' }}
        priority
      />
      {showText && (
        <span className={`ml-3 ${textClass} font-bold text-gradient-cyan tracking-tight`}>
          Lyceum
        </span>
      )}
    </div>
  )
}

export default LyceumLogo
