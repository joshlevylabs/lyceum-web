'use client'

import { useState } from 'react'
import { StaticPageLayout } from '@/components/StaticPageLayout'
import { EnvelopeSimple, Headset, Clock } from '@phosphor-icons/react'

const contactMethods = [
  {
    icon: EnvelopeSimple,
    title: 'General Inquiries',
    description: 'Questions, feedback, or partnerships',
    value: 'josh@thelyceum.io',
    href: 'mailto:josh@thelyceum.io'
  },
  {
    icon: Headset,
    title: 'Support',
    description: 'Technical help for existing customers',
    value: 'support@thelyceum.io',
    href: 'mailto:support@thelyceum.io'
  }
]

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      message: formData.get('message') as string
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message')
      }

      setSubmitted(true)
    } catch (err: any) {
      console.error('Contact form error:', err)
      setError(err.message || 'Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StaticPageLayout
      title="Contact Us"
      subtitle="Have a question or want to learn more? We'd love to hear from you."
      maxWidth="6xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Contact form */}
        <div>
          <div className="glass-card p-8">
            {submitted ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Message Sent!</h3>
                <p className="text-foreground/60 mb-6">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-cyan-400 hover:text-cyan-300 font-medium"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-6">Send Us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors disabled:opacity-50"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors disabled:opacity-50"
                      placeholder="you@company.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground mb-2">
                      Message
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 rounded-xl bg-foreground/5 border border-foreground/10 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-colors resize-none disabled:opacity-50"
                      placeholder="How can we help?"
                    />
                  </div>
                  {error && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold hover:from-cyan-400 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black"></div>
                        Sending...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-6">
          {/* Contact methods */}
          <div className="space-y-4">
            {contactMethods.map((method) => {
              const Icon = method.icon
              return (
                <a
                  key={method.title}
                  href={method.href}
                  className="glass-card p-6 flex items-center gap-4 hover:border-cyan-500/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground group-hover:text-cyan-400 transition-colors">
                      {method.title}
                    </h3>
                    <p className="text-sm text-foreground/50">{method.description}</p>
                    <p className="text-cyan-400">{method.value}</p>
                  </div>
                </a>
              )
            })}
          </div>

          {/* Response time */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h3 className="font-semibold text-foreground">Response Time</h3>
            </div>
            <p className="text-foreground/60 text-sm">
              We typically respond within 24 hours during business days. For urgent support issues,
              please email <a href="mailto:support@thelyceum.io" className="text-cyan-400 hover:text-cyan-300">support@thelyceum.io</a> directly.
            </p>
          </div>

          {/* FAQ link */}
          <div className="glass-card p-6 text-center">
            <h3 className="font-semibold text-foreground mb-2">Looking for quick answers?</h3>
            <p className="text-foreground/60 text-sm mb-4">
              Check out our FAQ for answers to common questions.
            </p>
            <a
              href="/faq"
              className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
            >
              Visit FAQ →
            </a>
          </div>

          {/* Demo CTA */}
          <div className="glass-card p-6 bg-gradient-to-br from-cyan-500/10 to-purple-500/5 text-center">
            <h3 className="font-semibold text-foreground mb-2">Want a personalized demo?</h3>
            <p className="text-foreground/60 text-sm mb-4">
              See how Lyceum can work for your specific use case.
            </p>
            <a
              href="/demo"
              className="inline-flex items-center px-6 py-2 rounded-lg bg-cyan-500 text-black font-semibold hover:bg-cyan-400 transition-colors text-sm"
            >
              Schedule Demo
            </a>
          </div>
        </div>
      </div>
    </StaticPageLayout>
  )
}
