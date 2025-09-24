'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CircleStackIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  EyeIcon,
  UserGroupIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import ClusterCreationWizard from '@/components/ClusterCreationWizard'

interface DatabaseCluster {
  id: string
  name: string
  description?: string
  cluster_key?: string
  cluster_type: 'production' | 'development' | 'analytics'
  status: 'provisioning' | 'active' | 'maintenance' | 'error' | 'terminated'
  region: string
  node_count: number
  cpu_per_node: number
  memory_per_node: string
  storage_per_node: string
  hot_tier_size?: string
  warm_tier_size?: string
  cold_tier_size?: string
  archive_enabled: boolean
  created_at: string
  updated_at: string
  health_status: 'healthy' | 'warning' | 'critical' | 'unknown'
  estimated_monthly_cost?: number
  actual_monthly_cost?: number
  user_role: 'admin' | 'editor' | 'analyst' | 'viewer'
}

export default function ClusterManagement() {
  const router = useRouter()
  const [clusters, setClusters] = useState<DatabaseCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'development' | 'analytics' | 'production'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'maintenance' | 'error' | 'provisioning' | 'terminated'>('active') // Default to 'active'
  const [filterHealth, setFilterHealth] = useState<'all' | 'healthy' | 'warning' | 'critical' | 'unknown'>('all')
  const [filterRegion, setFilterRegion] = useState<string>('all')
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    loadClusters()
  }, [filterType, filterStatus, filterHealth, filterRegion])

  const loadClusters = async () => {
    try {
      setLoading(true)
      
      // Get the access token from localStorage (same way as our API tests)
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        throw new Error('No access token found. Please refresh the page and try again.')
      }
      
      // Build query parameters
      const params = new URLSearchParams()
      if (filterType !== 'all') {
        params.append('cluster_type', filterType)
      }
      if (filterStatus !== 'all') {
        params.append('status', filterStatus)
      }
      params.append('limit', '50')
      
      // Fetch clusters from API
      const response = await fetch(`/api/clusters?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load clusters')
      }
      
      let filtered = data.clusters || []
      
      // Apply client-side search filter
      if (searchTerm) {
        filtered = filtered.filter((cluster: DatabaseCluster) =>
          cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cluster.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          cluster.region.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }
      
      setClusters(filtered)
      setLoading(false)
      
    } catch (error) {
      console.error('Failed to load clusters:', error)
      setLoading(false)
      // Show error state
      setClusters([])
    }
  }

  const handleWizardComplete = (cluster: any) => {
    setShowWizard(false)
    // Refresh clusters list to show the new cluster
    loadClusters()
    // Optional: Show success notification
    console.log('Cluster created successfully:', cluster.name)
  }

  const handleWizardCancel = () => {
    setShowWizard(false)
  }

  const handleViewCluster = (cluster: DatabaseCluster) => {
    // Use cluster_key if available, fallback to ID
    const clusterIdentifier = cluster.cluster_key || cluster.id
    router.push(`/admin/clusters/${clusterIdentifier}`)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'maintenance': return <ClockIcon className="w-5 h-5 text-yellow-500" />
      case 'error': return <XCircleIcon className="w-5 h-5 text-red-500" />
      case 'provisioning': return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />
      case 'terminated': return <XCircleIcon className="w-5 h-5 text-gray-500" />
      default: return <ExclamationTriangleIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'provisioning': return 'bg-blue-100 text-blue-800'
      case 'terminated': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'production': return 'bg-red-100 text-red-800'
      case 'development': return 'bg-blue-100 text-blue-800'
      case 'analytics': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      case 'unknown': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-red-600'
      case 'editor': return 'text-blue-600'
      case 'analyst': return 'text-purple-600'
      case 'viewer': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter clusters based on all criteria
  const filteredClusters = clusters.filter(cluster => {
    const matchesSearch = !searchTerm || 
      cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cluster.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cluster.region.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cluster.cluster_key?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || cluster.cluster_type === filterType
    const matchesStatus = filterStatus === 'all' || cluster.status === filterStatus
    const matchesHealth = filterHealth === 'all' || cluster.health_status === filterHealth
    const matchesRegion = filterRegion === 'all' || cluster.region === filterRegion
    
    return matchesSearch && matchesType && matchesStatus && matchesHealth && matchesRegion
  })

  // Get unique regions for filter dropdown
  const uniqueRegions = Array.from(new Set(clusters.map(cluster => cluster.region).filter(Boolean)))

  // Check if any filters are active (other than defaults)
  const hasActiveFilters = filterType !== 'all' || filterStatus !== 'active' || filterHealth !== 'all' || filterRegion !== 'all' || searchTerm !== ''

  // Clear all filters to defaults
  const clearFilters = () => {
    setSearchTerm('')
    setFilterType('all')
    setFilterStatus('active') // Default back to active
    setFilterHealth('all')
    setFilterRegion('all')
  }

  if (showWizard) {
    return (
      <ClusterCreationWizard
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <CircleStackIcon className="mr-3 h-8 w-8 text-blue-600" />
                Database Clusters
              </h1>
              <p className="mt-2 text-gray-600">
                Manage your high-performance ClickHouse database clusters for manufacturing data analytics
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={loadClusters}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
                Refresh
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowWizard(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create Cluster
                </button>
                <button
                  onClick={() => window.location.href = '/admin/cluster-management'}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Cog6ToothIcon className="-ml-1 mr-2 h-5 w-5" />
                  Advanced Management
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search clusters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="production">Production</option>
              <option value="development">Development</option>
              <option value="analytics">Analytics</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="error">Error</option>
              <option value="provisioning">Provisioning</option>
              <option value="terminated">Terminated</option>
            </select>

            {/* Health Filter */}
            <select
              value={filterHealth}
              onChange={(e) => setFilterHealth(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Health</option>
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="unknown">Unknown</option>
            </select>

            {/* Region Filter */}
            <select
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Regions</option>
              {uniqueRegions.map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            {/* Results Count and Clear Filters */}
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="flex items-center text-sm text-gray-600">
                <span className="font-medium">{filteredClusters.length}</span>
                <span className="ml-1">
                  {filteredClusters.length === 1 ? 'cluster' : 'clusters'} found
                </span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
          
          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">Active filters:</span>
                {searchTerm && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                    Search: "{searchTerm}"
                  </span>
                )}
                {filterType !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                    Type: {filterType}
                  </span>
                )}
                {filterStatus !== 'active' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                    Status: {filterStatus}
                  </span>
                )}
                {filterHealth !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                    Health: {filterHealth}
                  </span>
                )}
                {filterRegion !== 'all' && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                    Region: {filterRegion}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* JIRA-like Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    View
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cluster
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <ArrowPathIcon className="h-8 w-8 text-blue-600 animate-spin mr-3" />
                        <span className="text-gray-600">Loading clusters...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredClusters.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center">
                      <div className="text-center">
                        <CircleStackIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No clusters found</h3>
                        <p className="text-gray-600 mb-4">
                          {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                            ? 'Try adjusting your filters or search terms.'
                            : 'Get started by creating your first database cluster.'
                          }
                        </p>
                        {!searchTerm && filterType === 'all' && filterStatus === 'all' && (
                          <button
                            onClick={() => setShowWizard(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                            Create Database Cluster
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredClusters.map((cluster) => (
                    <tr key={cluster.id} className="hover:bg-gray-50">
                      {/* View */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleViewCluster(cluster)}
                          className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View & Manage Cluster"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>

                      {/* Cluster Name & Description */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CircleStackIcon className="h-8 w-8 text-blue-500 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{cluster.name}</div>
                            <div className="text-sm text-gray-500">{cluster.description}</div>
                          </div>
                        </div>
                      </td>

                      {/* Cluster Key */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-medium text-blue-600">
                          {cluster.cluster_key || `CLSTR-${filteredClusters.indexOf(cluster) + 1}`}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(cluster.cluster_type)}`}>
                          {cluster.cluster_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(cluster.status)}
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(cluster.status)}`}>
                            {cluster.status}
                          </span>
                        </div>
                      </td>

                      {/* Health */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getHealthColor(cluster.health_status)}`}>
                          {cluster.health_status}
                        </span>
                      </td>

                      {/* Region */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cluster.region}
                      </td>

                      {/* Resources */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>
                          <div className="flex items-center text-xs text-gray-600">
                            <ServerIcon className="h-3 w-3 mr-1" />
                            {cluster.node_count} nodes
                          </div>
                          <div className="flex items-center text-xs text-gray-600 mt-1">
                            <CpuChipIcon className="h-3 w-3 mr-1" />
                            {cluster.cpu_per_node} CPU, {cluster.memory_per_node}
                          </div>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            ${cluster.estimated_monthly_cost || 'N/A'}/mo
                          </div>
                          {cluster.actual_monthly_cost && (
                            <div className="text-xs text-gray-500">
                              Actual: ${cluster.actual_monthly_cost}/mo
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${getRoleColor(cluster.user_role)}`}>
                          {cluster.user_role}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(cluster.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded transition-colors" title="Performance">
                            <ChartBarIcon className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded transition-colors" title="Users">
                            <UserGroupIcon className="h-4 w-4" />
                          </button>
                          {cluster.status === 'active' && (
                            <button className="text-yellow-600 hover:text-yellow-900 p-1 hover:bg-yellow-50 rounded transition-colors" title="Enter maintenance">
                              <PauseIcon className="h-4 w-4" />
                            </button>
                          )}
                          {cluster.status === 'maintenance' && (
                            <button className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-colors" title="Resume">
                              <PlayIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{filteredClusters.length}</div>
              <div className="text-sm text-gray-600">Total Clusters</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {filteredClusters.filter(c => c.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {filteredClusters.filter(c => c.status === 'maintenance').length}
              </div>
              <div className="text-sm text-gray-600">Maintenance</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {filteredClusters.filter(c => c.status === 'error').length}
              </div>
              <div className="text-sm text-gray-600">Error</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                ${filteredClusters.reduce((sum, c) => sum + (c.estimated_monthly_cost || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">Est. Monthly Cost</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}