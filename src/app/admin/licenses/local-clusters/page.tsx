'use client'

import { useState, useEffect } from 'react'
import { KeyIcon, CheckCircleIcon, XCircleIcon, PencilIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

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
    return <div className="flex justify-center items-center min-h-screen"><ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 flex items-center">
        <KeyIcon className="h-8 w-8 mr-3 text-blue-600" />
        Local Cluster License Management
      </h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Local Cluster</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Limits</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {licenses.map((license) => (
              <tr key={license.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-mono font-medium text-gray-900">{license.key_code}</div>
                  <div className="text-xs text-gray-500">{license.status}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {license.user_email || 'Unassigned'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    {license.license_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {license.allows_local_cluster ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircleIcon className="h-5 w-5 text-gray-400" />
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {license.local_cluster_limits ? (
                    <div>
                      <div>{license.local_cluster_limits.max_storage_gb} GB</div>
                      <div className="text-xs text-gray-500">{(license.local_cluster_limits.max_monthly_queries / 1000000).toFixed(1)}M queries</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {license.current_usage ? (
                    <div>
                      <div>{license.current_usage.storage_used_gb.toFixed(1)} GB</div>
                      <div className="text-xs text-gray-500">{(license.current_usage.queries_this_month / 1000).toFixed(0)}K queries</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">No usage</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => toggleLocalCluster(license.id, license.allows_local_cluster)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    {license.allows_local_cluster ? 'Disable' : 'Enable'}
                  </button>
                  <button className="text-gray-600 hover:text-gray-800">
                    <PencilIcon className="h-4 w-4" />
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




