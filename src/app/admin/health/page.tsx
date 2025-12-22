'use client'

import { ShieldCheck, CheckCircle, XCircle } from '@phosphor-icons/react'
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
        <h1 className="text-3xl font-bold text-foreground">System Health</h1>
        <p className="mt-2 text-foreground/60">
          Monitor the health and status of platform services
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="px-6 py-4 border-b border-cyan-500/10">
          <div className="flex items-center">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mr-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400" weight="duotone" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              Service Status
            </h2>
          </div>
        </div>

        <div className="divide-y divide-cyan-500/10">
          {checks.map((check) => (
            <div key={check.name} className="px-6 py-4 flex items-center justify-between">
              <div className="flex items-center">
                {check.status === 'checking' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500 mr-3" />
                )}
                {check.status === 'healthy' && (
                  <CheckCircle className="h-5 w-5 text-emerald-400 mr-3" weight="duotone" />
                )}
                {check.status === 'unhealthy' && (
                  <XCircle className="h-5 w-5 text-red-400 mr-3" weight="duotone" />
                )}
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    {check.name}
                  </h3>
                  {check.message && (
                    <p className="text-xs text-foreground/50">
                      {check.message}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  check.status === 'healthy'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : check.status === 'unhealthy'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                }`}
              >
                {check.status === 'checking' ? 'Checking...' : check.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
        <p className="text-sm text-foreground/70">
          <strong className="text-cyan-400">Note:</strong> This is a placeholder page. Implement real health checks
          by querying actual services and databases.
        </p>
      </div>
    </div>
  )
}

