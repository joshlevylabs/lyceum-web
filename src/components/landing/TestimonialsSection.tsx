'use client'

import { motion } from 'framer-motion'
import { Star } from '@phosphor-icons/react'
import { testimonials, type Testimonial } from '@/data/landing'
import { fadeInUp, staggerContainer } from '@/lib/animation-variants'
import { SectionWrapper } from './SectionWrapper'

function TestimonialCard({ testimonial, featured = false }: { testimonial: Testimonial; featured?: boolean }) {
  const initials = testimonial.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()

  return (
    <motion.div
      variants={fadeInUp}
      className={`glass-card p-8 h-full flex flex-col ${featured ? 'p-10' : ''}`}
    >
      {/* Stars - Gold tertiary color */}
      <div className="flex gap-1 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            weight="fill"
            className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-500' : 'text-foreground/20'}`}
          />
        ))}
      </div>

      {/* Quote */}
      <blockquote className={`text-foreground/80 leading-relaxed flex-1 ${featured ? 'text-xl' : 'text-base'}`}>
        &ldquo;{testimonial.quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-4 mt-6 pt-6 border-t border-foreground/10">
        {/* Avatar */}
        {testimonial.avatar ? (
          <img
            src={testimonial.avatar}
            alt={testimonial.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-yellow-500/20 flex items-center justify-center text-foreground/60 font-semibold">
            {initials}
          </div>
        )}
        <div>
          <div className="font-semibold text-foreground">{testimonial.name}</div>
          <div className="text-sm text-foreground/50">
            {testimonial.title}, {testimonial.company}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function TestimonialsSection() {
  const featuredTestimonial = testimonials[0]

  return (
    <SectionWrapper id="testimonials" className="py-24 bg-foreground/[0.02]">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.p variants={fadeInUp} className="text-cyan-400 font-semibold mb-4">
            What Industry Leaders Say
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            Built for Test Engineers During All Stages of Product Development
          </motion.h2>
        </motion.div>

        {/* Single featured testimonial */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          <TestimonialCard testimonial={featuredTestimonial} featured />
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
