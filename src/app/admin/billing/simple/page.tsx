'use client'

import React from 'react'
import { CreditCard, Check, Star, Lightning } from '@phosphor-icons/react'

export default function SimpleBillingPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gradient-cyan mb-4">Database Cluster Plans</h1>
        <p className="text-xl text-foreground/60">Choose the perfect plan for your data analytics needs</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {/* Starter Plan */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Starter</h2>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Lightning className="w-6 h-6 text-cyan-400" weight="duotone" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gradient-cyan">$29</span>
            <span className="text-foreground/60">/month</span>
          </div>
          <p className="text-foreground/60 text-sm mb-6">Perfect for small teams and testing</p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>1 Database Cluster</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Up to 5 Users</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>10GB Storage</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Basic Analytics</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Email Support</span>
            </li>
          </ul>
          <button className="btn-ghost w-full flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" weight="duotone" />
            Get Started
          </button>
        </div>

        {/* Professional Plan */}
        <div className="glass-card p-6 relative border-cyan-500/30 glow-cyan-border">
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-black px-4 py-1 text-sm font-semibold rounded-full inline-flex items-center">
              <Star className="w-3 h-3 mr-1" weight="fill" />
              Most Popular
            </span>
          </div>
          <div className="flex items-center justify-between mb-4 pt-2">
            <h2 className="text-2xl font-bold text-foreground">Professional</h2>
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Lightning className="w-6 h-6 text-cyan-400" weight="duotone" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gradient-cyan">$99</span>
            <span className="text-foreground/60">/month</span>
          </div>
          <p className="text-foreground/60 text-sm mb-6">For growing teams and production workloads</p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>5 Database Clusters</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Up to 25 Users</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>100GB Storage</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Advanced Analytics</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Priority Support</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>API Access</span>
            </li>
          </ul>
          <button className="btn-primary w-full flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" />
            Upgrade Now
          </button>
        </div>

        {/* Enterprise Plan */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-foreground">Enterprise</h2>
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Lightning className="w-6 h-6 text-purple-400" weight="duotone" />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-purple-400">$299</span>
            <span className="text-foreground/60">/month</span>
          </div>
          <p className="text-foreground/60 text-sm mb-6">For large organizations</p>
          <ul className="space-y-3 mb-6">
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Unlimited Clusters</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Unlimited Users</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>1TB Storage</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Custom Analytics</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>24/7 Support</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>SSO Integration</span>
            </li>
            <li className="flex items-center gap-2 text-foreground/80">
              <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" weight="bold" />
              <span>Dedicated Account Manager</span>
            </li>
          </ul>
          <button className="btn-ghost w-full flex items-center justify-center gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
            <CreditCard className="w-4 h-4" weight="duotone" />
            Contact Sales
          </button>
        </div>
      </div>

      <div className="text-center mt-12 space-y-4">
        <div className="glass-card p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4">All plans include:</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-foreground/70">
              <Check className="w-4 h-4 text-emerald-400" weight="bold" />
              <span>30-day free trial</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-foreground/70">
              <Check className="w-4 h-4 text-emerald-400" weight="bold" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-foreground/70">
              <Check className="w-4 h-4 text-emerald-400" weight="bold" />
              <span>99.9% uptime SLA</span>
            </div>
          </div>
        </div>

        <p className="text-foreground/60">
          Need help choosing?{' '}
          <a href="mailto:support@lyceum.com" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
            Contact our team
          </a>
        </p>
      </div>

      <div className="mt-8 glass-card p-4 text-sm text-foreground/60">
        <strong className="text-foreground/80">Test Version:</strong> This is the simple billing page without authentication checks.
        <br />
        <strong className="text-foreground/80">URL:</strong> <code className="font-mono text-cyan-400">/admin/billing/simple</code>
        <br />
        <strong className="text-foreground/80">Status:</strong> <span className="text-emerald-400">Working without auth timeout issues</span>
      </div>
    </div>
  )
}
