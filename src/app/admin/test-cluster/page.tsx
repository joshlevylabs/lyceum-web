'use client'

import { useState } from 'react'
import { CheckCircleIcon, XCircleIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface ClusterStatus {
  id: string
  machine_fingerprint: string
  clickhouse_version: string | null
  machine_os: string | null
  machine_specs: {
    cpu_cores: number
    memory_gb: number
  } | null
  status: {
    is_online: boolean
    last_heartbeat_at: string
    hours_since_heartbeat: number
    status_label: string
  }
  usage: {
    storage_used_gb: number
    storage_limit_gb: number
    storage_percent: number
    queries_this_month: number
    query_limit: number
    query_percent: number
  }
  license_type: string
  created_at: string
}

interface TestResult {
  success: boolean
  hasCluster: boolean
  hasOnlineCluster?: boolean
  user?: {
    email: string
    full_name: string
  }
  clusters?: ClusterStatus[]
  summary?: {
    total_clusters: number
    online_clusters: number
    offline_clusters: number
  }
  message?: string
  error?: string
}

export default function TestClusterConnection() {
  const [email, setEmail] = useState('josh@thelyceum.io')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch(`/api/admin/test-cluster-connection?email=${encodeURIComponent(email)}`)
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        hasCluster: false,
        error: error instanceof Error ? error.message : 'Failed to test connection'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (isOnline: boolean) => {
    return isOnline
      ? <CheckCircleIcon className="h-6 w-6 text-green-500" />
      : <XCircleIcon className="h-6 w-6 text-gray-500" />
  }

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 80) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Test Cluster Connection</h1>
        <p className="text-gray-600">Check if a user has a local CentCom cluster that is currently online</p>
      </div>

      {/* Test Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-end space-x-4">
          <div className="flex-1">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              User Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={testConnection}
            disabled={loading || !email}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className={`rounded-lg shadow p-6 ${
            result.success && result.hasOnlineCluster ? 'bg-green-50 border-2 border-green-200' :
            result.success && result.hasCluster ? 'bg-yellow-50 border-2 border-yellow-200' :
            result.success ? 'bg-gray-50 border-2 border-gray-200' :
            'bg-red-50 border-2 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                {result.success && result.hasOnlineCluster ? (
                  <>
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">Cluster Online!</h3>
                      <p className="text-sm text-green-700">User has an active local cluster</p>
                    </div>
                  </>
                ) : result.success && result.hasCluster ? (
                  <>
                    <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-yellow-900">Cluster Offline</h3>
                      <p className="text-sm text-yellow-700">User has a cluster but it's not currently connected</p>
                    </div>
                  </>
                ) : result.success ? (
                  <>
                    <XCircleIcon className="h-8 w-8 text-gray-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">No Cluster Found</h3>
                      <p className="text-sm text-gray-700">{result.message}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircleIcon className="h-8 w-8 text-red-600" />
                    <div>
                      <h3 className="text-lg font-semibold text-red-900">Error</h3>
                      <p className="text-sm text-red-700">{result.error}</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {result.user && (
              <div className="bg-white rounded-md p-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">User Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium text-gray-900">{result.user.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium text-gray-900">{result.user.full_name}</span>
                  </div>
                </div>
              </div>
            )}

            {result.summary && (
              <div className="bg-white rounded-md p-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{result.summary.total_clusters}</div>
                    <div className="text-gray-600">Total Clusters</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{result.summary.online_clusters}</div>
                    <div className="text-gray-600">Online</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{result.summary.offline_clusters}</div>
                    <div className="text-gray-600">Offline</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Cluster Details */}
          {result.clusters && result.clusters.length > 0 && (
            <div className="space-y-4">
              {result.clusters.map((cluster) => (
                <div key={cluster.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(cluster.status.is_online)}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {cluster.status.status_label}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        Machine: {cluster.machine_fingerprint.substring(0, 16)}...
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Last Heartbeat</div>
                      <div className="text-sm font-medium text-gray-900">
                        {cluster.status.hours_since_heartbeat < 1
                          ? 'Just now'
                          : `${cluster.status.hours_since_heartbeat}h ago`}
                      </div>
                    </div>
                  </div>

                  {/* System Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b">
                    <div>
                      <div className="text-xs text-gray-500">ClickHouse</div>
                      <div className="text-sm font-medium text-gray-900">{cluster.clickhouse_version || 'Unknown'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">OS</div>
                      <div className="text-sm font-medium text-gray-900">{cluster.machine_os || 'Unknown'}</div>
                    </div>
                    {cluster.machine_specs && (
                      <>
                        <div>
                          <div className="text-xs text-gray-500">CPU Cores</div>
                          <div className="text-sm font-medium text-gray-900">{cluster.machine_specs.cpu_cores}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Memory</div>
                          <div className="text-sm font-medium text-gray-900">{cluster.machine_specs.memory_gb} GB</div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Usage Bars */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Storage Usage</span>
                        <span className="text-sm text-gray-600">
                          {cluster.usage.storage_used_gb.toFixed(2)} / {cluster.usage.storage_limit_gb} GB
                          ({cluster.usage.storage_percent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(cluster.usage.storage_percent)}`}
                          style={{ width: `${Math.min(cluster.usage.storage_percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Query Usage (This Month)</span>
                        <span className="text-sm text-gray-600">
                          {cluster.usage.queries_this_month.toLocaleString()} / {cluster.usage.query_limit.toLocaleString()}
                          ({cluster.usage.query_percent.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUsageColor(cluster.usage.query_percent)}`}
                          style={{ width: `${Math.min(cluster.usage.query_percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* License Info */}
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-500">License Type: </span>
                      <span className="text-sm font-medium text-gray-900">{cluster.license_type}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Created: </span>
                      <span className="text-sm font-medium text-gray-900">
                        {new Date(cluster.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
