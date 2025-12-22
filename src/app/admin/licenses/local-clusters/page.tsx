'use client'

import { useState, useEffect } from 'react'
import { Key, CheckCircle, XCircle, Pencil, ArrowsClockwise } from '@phosphor-icons/react'

interface License {
  id: string
  key_code: string
  license_type: string
  status: string
  allows_local_cluster: boolean
  local_cluster_limits: any
  assigned_to: string | null
  user_email?: string
  current_usage?: {
    storage_used_gb: number
    queries_this_month: number
  }
}

export default function LocalClusterLicenseManagement() {
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLicense, setEditingLicense] = useState<License | null>(null)

  useEffect(() => {
    fetchLicenses()
  }, [])

  async function fetchLicenses() {
    try {
      const response = await fetch('/api/admin/licenses/local-clusters')
      const data = await response.json()
      setLicenses(data.licenses || [])
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function toggleLocalCluster(licenseId: string, currentValue: boolean) {
    try {
      await fetch(`/api/admin/licenses/${licenseId}/toggle-local-cluster`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allows_local_cluster: !currentValue })
      })
      fetchLicenses()
    } catch (err) {
      console.error('Error:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <ArrowsClockwise className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center text-foreground">
        <Key className="h-8 w-8 mr-3 text-cyan-400" weight="duotone" />
        Local Cluster License Management
      </h1>

      <div className="glass-card rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-cyan-500/10">
          <thead className="bg-cyan-500/5">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase">License</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase">Local Cluster</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase">Limits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-500/10">
            {licenses.map((license) => (
              <tr key={license.id} className="hover:bg-cyan-500/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono font-medium text-foreground">{license.key_code}</div>
                  <div className="text-xs text-foreground/60">{license.status}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {license.user_email || 'Unassigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {license.license_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {license.allows_local_cluster ? (
                    <CheckCircle className="h-5 w-5 text-emerald-400" weight="duotone" />
                  ) : (
                    <XCircle className="h-5 w-5 text-foreground/40" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {license.local_cluster_limits ? (
                    <div>
                      <div>{license.local_cluster_limits.max_storage_gb} GB</div>
                      <div className="text-xs text-foreground/60">{(license.local_cluster_limits.max_monthly_queries / 1000000).toFixed(1)}M queries</div>
                    </div>
                  ) : (
                    <span className="text-foreground/40">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {license.current_usage ? (
                    <div>
                      <div className="text-foreground">{license.current_usage.storage_used_gb.toFixed(1)} GB</div>
                      <div className="text-xs text-foreground/60">{(license.current_usage.queries_this_month / 1000).toFixed(0)}K queries</div>
                    </div>
                  ) : (
                    <span className="text-foreground/40">No usage</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => toggleLocalCluster(license.id, license.allows_local_cluster)}
                    className="text-cyan-400 hover:text-cyan-300 mr-3 transition-colors"
                  >
                    {license.allows_local_cluster ? 'Disable' : 'Enable'}
                  </button>
                  <button className="text-foreground/60 hover:text-cyan-400 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}




