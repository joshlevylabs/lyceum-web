'use client'

import { ChartBarIcon } from '@heroicons/react/24/outline'

export default function AdminAnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Monitor platform usage, performance metrics, and user activity
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <ChartBarIcon className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Analytics Dashboard Coming Soon
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          This page will show comprehensive analytics including user activity, license usage, 
          cluster performance, and billing metrics.
        </p>
      </div>
    </div>
  )
}

