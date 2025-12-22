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
      className={`glass-card p-8 h-full flex flex-col ${featured ? 'lg:col-span-2 lg:p-10' : ''}`}
    >
      {/* Stars */}
      <div className="flex gap-1 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            weight="fill"
            className={`w-5 h-5 ${i < testimonial.rating ? 'text-amber-400' : 'text-foreground/20'}`}
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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center text-foreground/60 font-semibold">
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
  // Split testimonials: first one is featured, rest are regular
  const [featuredTestimonial, ...regularTestimonials] = testimonials

  return (
    <SectionWrapper id="testimonials" className="py-24 bg-foreground/[0.02]">
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
            Customer Stories
          </motion.p>
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
            Trusted by Engineers Worldwide
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-foreground/60 max-w-2xl mx-auto">
            See what industry professionals are saying about Lyceum and how it has transformed their analytics workflow.
          </motion.p>
        </motion.div>

        {/* Testimonials grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
        >
          {/* Featured testimonial */}
          <TestimonialCard testimonial={featuredTestimonial} featured />

          {/* Regular testimonials */}
          {regularTestimonials.slice(0, 4).map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </motion.div>

        {/* Social proof footer */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-foreground/40 text-sm">
            Join 10,000+ engineers who trust Lyceum for their industrial analytics
          </p>
        </motion.div>
      </div>
    </SectionWrapper>
  )
}
