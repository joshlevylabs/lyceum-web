'use client'

import { useState, useEffect } from 'react'
import { ChartBarIcon, ArrowTrendingUpIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface UsageData {
  date: string
  storage_gb: number
  queries: number
  user_count: number
}

interface TierDistribution {
  tier: string
  count: number
  percentage: number
}

interface WarningUser {
  user_email: string
  license_type: string
  storage_percent: number
  query_percent: number
  max_percent: number
}

export default function LocalClusterUsageCharts() {
  const [usageHistory, setUsageHistory] = useState<UsageData[]>([])
  const [tierDistribution, setTierDistribution] = useState<TierDistribution[]>([])
  const [warningUsers, setWarningUsers] = useState<WarningUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsageData()
    const interval = setInterval(fetchUsageData, 5 * 60 * 1000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [])

  async function fetchUsageData() {
    try {
      const response = await fetch('/api/admin/centcom-usage-analytics')
      if (!response.ok) throw new Error('Failed to fetch usage data')
      
      const data = await response.json()
      setUsageHistory(data.usageHistory || [])
      setTierDistribution(data.tierDistribution || [])
      setWarningUsers(data.warningUsers || [])
    } catch (err) {
      console.error('Error fetching usage data:', err)
    } finally {
      setLoading(false)
    }
  }

  function getTierColor(tier: string): string {
    switch (tier.toLowerCase()) {
      case 'enterprise': return 'bg-purple-500'
      case 'professional': return 'bg-blue-500'
      case 'basic': return 'bg-green-500'
      case 'trial': return 'bg-yellow-500'
      case 'gratis': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  function getWarningColor(percent: number): string {
    if (percent >= 95) return 'text-red-600 bg-red-100'
    if (percent >= 90) return 'text-orange-600 bg-orange-100'
    if (percent >= 80) return 'text-yellow-600 bg-yellow-100'
    return 'text-gray-600 bg-gray-100'
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading usage analytics...</p>
      </div>
    )
  }

  const maxStorage = Math.max(...usageHistory.map(d => d.storage_gb), 1)
  const maxQueries = Math.max(...usageHistory.map(d => d.queries), 1)

  return (
    <div className="space-y-6">
      {/* Usage Warnings */}
      {warningUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 mr-2" />
            <h3 className="text-lg font-semibold text-yellow-900">Users Approaching Limits</h3>
          </div>
          
          <div className="space-y-3">
            {warningUsers.map((user, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-yellow-300">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{user.user_email}</p>
                    <p className="text-sm text-gray-600">{user.license_type}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getWarningColor(user.max_percent)}`}>
                    {user.max_percent.toFixed(1)}% Used
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div>
                    <p className="text-xs text-gray-500">Storage</p>
                    <div className="flex items-center mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${user.storage_percent >= 90 ? 'bg-red-500' : user.storage_percent >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(user.storage_percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{user.storage_percent.toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500">Queries</p>
                    <div className="flex items-center mt-1">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${user.query_percent >= 90 ? 'bg-red-500' : user.query_percent >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(user.query_percent, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{user.query_percent.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Usage Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-blue-600" />
            Storage Usage Trend
          </h3>
          
          {usageHistory.length > 0 ? (
            <div className="space-y-2">
              {usageHistory.slice(0, 10).map((data, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="text-xs text-gray-500 w-20">{new Date(data.date).toLocaleDateString()}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 mx-2">
                    <div 
                      className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(data.storage_gb / maxStorage) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">{data.storage_gb.toFixed(1)} GB</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No usage data available</p>
          )}
        </div>

        {/* Query Volume Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-green-600" />
            Query Volume Trend
          </h3>
          
          {usageHistory.length > 0 ? (
            <div className="space-y-2">
              {usageHistory.slice(0, 10).map((data, idx) => (
                <div key={idx} className="flex items-center">
                  <span className="text-xs text-gray-500 w-20">{new Date(data.date).toLocaleDateString()}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 mx-2">
                    <div 
                      className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${(data.queries / maxQueries) * 100}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {data.queries >= 1000000 ? `${(data.queries / 1000000).toFixed(1)}M` : 
                         data.queries >= 1000 ? `${(data.queries / 1000).toFixed(1)}K` : 
                         data.queries}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No query data available</p>
          )}
        </div>
      </div>

      {/* License Tier Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">License Tier Distribution</h3>
        
        {tierDistribution.length > 0 ? (
          <div>
            {/* Stacked Bar */}
            <div className="flex h-8 rounded-lg overflow-hidden mb-4">
              {tierDistribution.map((tier, idx) => (
                <div
                  key={idx}
                  className={`${getTierColor(tier.tier)} flex items-center justify-center`}
                  style={{ width: `${tier.percentage}%` }}
                  title={`${tier.tier}: ${tier.count} (${tier.percentage.toFixed(1)}%)`}
                >
                  {tier.percentage > 10 && (
                    <span className="text-xs text-white font-medium">{tier.percentage.toFixed(0)}%</span>
                  )}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {tierDistribution.map((tier, idx) => (
                <div key={idx} className="flex items-center">
                  <div className={`w-3 h-3 rounded ${getTierColor(tier.tier)} mr-2`} />
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">{tier.tier}</p>
                    <p className="text-gray-600">{tier.count} ({tier.percentage.toFixed(1)}%)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No tier distribution data available</p>
        )}
      </div>
    </div>
  )
}




