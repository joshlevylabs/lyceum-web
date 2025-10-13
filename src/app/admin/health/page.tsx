'use client'

import { ShieldCheckIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

interface HealthCheck {
  name: string
  status: 'healthy' | 'unhealthy' | 'checking'
  message?: string
}

export default function AdminHealthPage() {
  const [checks, setChecks] = useState<HealthCheck[]>([
    { name: 'Database Connection', status: 'checking' },
    { name: 'Authentication Service', status: 'checking' },
    { name: 'API Endpoints', status: 'checking' },
    { name: 'Storage Service', status: 'checking' },
  ])

  useEffect(() => {
    // Simulate health checks
    const timeout = setTimeout(() => {
      setChecks([
        { name: 'Database Connection', status: 'healthy', message: 'Connected to Supabase' },
        { name: 'Authentication Service', status: 'healthy', message: 'Auth service operational' },
        { name: 'API Endpoints', status: 'healthy', message: 'All endpoints responding' },
        { name: 'Storage Service', status: 'healthy', message: 'Storage accessible' },
      ])
    }, 1000)

    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Health</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Monitor the health and status of platform services
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <ShieldCheckIcon className="h-6 w-6 text-green-500 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Service Status
            </h2>
          </div>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {checks.map((check) => (
            <div key={check.name} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                {check.status === 'checking' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-3" />
                )}
                {check.status === 'healthy' && (
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3" />
                )}
                {check.status === 'unhealthy' && (
                  <XCircleIcon className="h-5 w-5 text-red-500 mr-3" />
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {check.name}
                  </h3>
                  {check.message && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {check.message}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  check.status === 'healthy'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : check.status === 'unhealthy'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {check.status === 'checking' ? 'Checking...' : check.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 <strong>Note:</strong> This is a placeholder page. Implement real health checks 
          by querying actual services and databases.
        </p>
      </div>
    </div>
  )
}

