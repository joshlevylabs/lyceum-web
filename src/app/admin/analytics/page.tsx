'use client'

import { ChartBar } from '@phosphor-icons/react'

export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Platform Analytics</h1>
        <p className="mt-2 text-foreground/60">
          Monitor platform usage, performance metrics, and user activity
        </p>
      </div>

      <div className="glass-card p-8 text-center">
        <ChartBar className="mx-auto h-16 w-16 text-foreground/40 mb-4" weight="duotone" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Analytics Dashboard Coming Soon
        </h2>
        <p className="text-foreground/60 max-w-md mx-auto">
          This page will show comprehensive analytics including user activity, license usage,
          cluster performance, and billing metrics.
        </p>
      </div>
    </div>
  )
}

