'use client'

import React from 'react'
import { motion, useInView } from 'framer-motion'
import { useRef, ReactNode } from 'react'
import { telescopeIn } from '@/lib/animation-variants'

interface SectionWrapperProps {
  children: ReactNode
  id: string
  className?: string
  delay?: number
  once?: boolean
}

export function SectionWrapper({
  children,
  id,
  className = '',
  delay = 0,
  once = true
}: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null)
  const isInView = useInView(ref, {
    once,
    margin: '-100px 0px -100px 0px'
  })

  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: telescopeIn.hidden,
        visible: {
          ...telescopeIn.visible,
          transition: {
            ...((telescopeIn.visible as { transition?: object }).transition || {}),
            delay
          }
        }
      }}
    >
      {children}
    </motion.section>
  )
}

// Wrapper without the section element (for custom elements)
interface AnimatedWrapperProps {
  children: ReactNode
  className?: string
  delay?: number
  once?: boolean
  as?: keyof React.JSX.IntrinsicElements
}

export function AnimatedWrapper({
  children,
  className = '',
  delay = 0,
  once = true,
  as: Component = 'div'
}: AnimatedWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, {
    once,
    margin: '-50px 0px -50px 0px'
  })

  const MotionComponent = motion(Component as 'div')

  return (
    <MotionComponent
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: { opacity: 0, y: 30 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.6,
            delay,
            ease: [0.22, 1, 0.36, 1]
          }
        }
      }}
    >
      {children}
    </MotionComponent>
  )
}
