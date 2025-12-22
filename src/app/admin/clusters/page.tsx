'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Database as CircleStack,
  Plus,
  MagnifyingGlass,
  CheckCircle,
  Warning as ExclamationTriangle,
  XCircle,
  Clock,
  Cpu as CpuChip,
  HardDrives as Server,
  ChartBar,
  Gear as Cog6Tooth,
  Play,
  Pause,
  ArrowsClockwise as ArrowPath,
  Eye,
  UserCircle as UserGroup,
  CurrencyDollar,
  Users as UsersIcon,
  Money as Banknotes,
  Wrench as WrenchScrewdriver
} from '@phosphor-icons/react'
import UnifiedClusterWizard from '@/components/UnifiedClusterWizard'
import { Badge } from '@/components/ui/badge'

interface UnifiedCluster {
  id: string
  cluster_key: string
  name: string
  description?: string
  architecture: 'traditional' | 'optimized' | 'centcom'
  cluster_type: string
  tier?: string
  status: string
  health_status: string
  region: string
  
  // Traditional cluster fields
  node_count?: number
  cpu_per_node?: number
  memory_per_node?: string
  storage_per_node?: string
  
  // Optimized cluster fields
  customer_id?: string
  monthly_curves_limit?: number
  storage_limit?: string
  processing_endpoint?: string
  tier_features?: string[]
  
  // CentCom cluster fields
  user_email?: string
  user_full_name?: string
  license_type?: string
  machine_fingerprint?: string
  storage_used_gb?: number
  queries_this_month?: number
  clickhouse_version?: string
  machine_os?: string
  last_heartbeat_at?: string
  offline_grace_days?: number
  
  // Billing and cost
  estimated_monthly_cost: number
  actual_monthly_cost?: number
  pricing_model: string
  responsible_user_id?: string
  
  // User assignment
  current_assigned_users: number
  max_assigned_users: number
  user_role: string
  
  // Timestamps
  created_at: string
  updated_at: string
}

export default function UnifiedClusterManagement() {
  const router = useRouter()
  const [clusters, setClusters] = useState<UnifiedCluster[]>([])
  const [loading, setLoading] = useState(true)
  const [showSetupRequired, setShowSetupRequired] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterArchitecture, setFilterArchitecture] = useState<'all' | 'traditional' | 'optimized' | 'centcom'>('all')
  const [filterType, setFilterType] = useState<'all' | 'development' | 'staging' | 'production' | 'analytics'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'creating' | 'active' | 'maintenance' | 'error' | 'terminated'>('active')
  const [showWizard, setShowWizard] = useState(false)

  useEffect(() => {
    loadClusters()
  }, [filterArchitecture, filterType, filterStatus])

  const loadClusters = async () => {
    try {
      setLoading(true)

      // Get auth headers using getSession (auto-refreshes tokens)
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('No access token found. Please refresh the page and try again.')
      }

      const accessToken = session.access_token

      const params = new URLSearchParams()
      if (filterArchitecture !== 'all' && filterArchitecture !== 'centcom') params.append('architecture', filterArchitecture)
      if (filterType !== 'all') params.append('cluster_type', filterType)
      if (filterStatus !== 'all') params.append('status', filterStatus)
      params.append('limit', '50')

      // Fetch regular clusters and CentCom clusters in parallel
      const [clustersResponse, centcomResponse] = await Promise.all([
        // Regular clusters
        fetch(`/api/clusters?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }),
        // CentCom clusters with auth header
        fetch('/api/admin/centcom-clusters', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
      ])
      
      if (!clustersResponse.ok) {
        throw new Error(`HTTP error! status: ${clustersResponse.status}`)
      }
      
      const clustersData = await clustersResponse.json()
      const centcomData = centcomResponse.ok ? await centcomResponse.json() : { clusters: [] }
      
      if (!clustersData.success) {
        throw new Error(clustersData.error || 'Failed to load clusters')
      }
      
      // Transform CentCom clusters to match UnifiedCluster interface
      const transformedCentcomClusters: UnifiedCluster[] = (centcomData.clusters || []).map((cc: any) => ({
        id: `centcom-${cc.id}`,
        cluster_key: cc.cluster_key || cc.machine_fingerprint || `centcom-${cc.id}`,
        name: `${cc.user_full_name || cc.user_email}'s Local Cluster`,
        description: `Local ClickHouse cluster (${cc.machine_os || 'Unknown OS'})`,
        architecture: 'centcom' as const,
        cluster_type: 'local',
        tier: cc.license_type || 'unknown',
        status: cc.is_online ? 'active' : 'offline',
        health_status: cc.is_online ? 'healthy' : (cc.in_grace_period ? 'warning' : 'critical'),
        region: 'Local',
        
        // CentCom specific fields
        user_email: cc.user_email,
        user_full_name: cc.user_full_name,
        license_type: cc.license_type,
        machine_fingerprint: cc.machine_fingerprint,
        storage_used_gb: cc.storage_used_gb,
        queries_this_month: cc.queries_this_month,
        clickhouse_version: cc.clickhouse_version,
        machine_os: cc.machine_os,
        last_heartbeat_at: cc.last_heartbeat_at,
        offline_grace_days: cc.offline_grace_days,
        
        // Billing
        estimated_monthly_cost: 0, // Local clusters don't have cost
        actual_monthly_cost: 0,
        pricing_model: 'local',
        responsible_user_id: cc.user_id,
        
        // User assignment
        current_assigned_users: 1,
        max_assigned_users: 1,
        user_role: 'owner',
        
        // Timestamps  
        created_at: cc.first_heartbeat_at || cc.created_at,
        updated_at: cc.last_heartbeat_at || cc.updated_at
      }))

      // Combine regular clusters with CentCom clusters, deduplicating by cluster_key
      const clusterMap = new Map()

      // Add regular clusters first
      for (const cluster of (clustersData.clusters || [])) {
        if (cluster.cluster_key) {
          clusterMap.set(cluster.cluster_key, cluster)
        }
      }

      // Add CentCom clusters only if they don't already exist
      for (const cluster of transformedCentcomClusters) {
        if (cluster.cluster_key && !clusterMap.has(cluster.cluster_key)) {
          clusterMap.set(cluster.cluster_key, cluster)
        }
      }

      const allClusters = Array.from(clusterMap.values())

      // Apply architecture filter for CentCom
      const filteredClusters = filterArchitecture === 'centcom'
        ? allClusters.filter(c => c.architecture === 'centcom')
        : filterArchitecture === 'all'
          ? allClusters
          : allClusters.filter(c => c.architecture !== 'centcom')
      
      // Check if database setup is required
      if (clustersData.setup_required && transformedCentcomClusters.length === 0) {
        setClusters([])
        setShowSetupRequired(true)
      } else {
        setClusters(filteredClusters)
        setShowSetupRequired(false)
      }
      
      setLoading(false)
      
    } catch (error) {
      console.error('Failed to load clusters:', error)
      setLoading(false)
      setClusters([])
      setShowSetupRequired(true)
    }
  }

  const handleWizardComplete = (cluster: any) => {
    setShowWizard(false)
    loadClusters()
    console.log('Cluster created successfully:', cluster.name)
  }

  const handleWizardCancel = () => {
    setShowWizard(false)
  }

  const handleViewCluster = (cluster: UnifiedCluster) => {
    router.push(`/admin/clusters/${cluster.cluster_key}`)
  }

  const handleClusterAction = async (action: string, cluster: UnifiedCluster) => {
    switch (action) {
      case 'view':
        handleViewCluster(cluster)
        break
      case 'manage-users':
        router.push(`/admin/clusters/${cluster.cluster_key}/users`)
        break
      case 'manage-billing':
        router.push(`/admin/clusters/${cluster.cluster_key}/billing`)
        break
      case 'settings':
        router.push(`/admin/clusters/${cluster.cluster_key}/settings`)
        break
      case 'analytics':
        router.push(`/admin/clusters/${cluster.cluster_key}/analytics`)
        break
      case 'process-curves':
        if (cluster.architecture === 'optimized' && cluster.customer_id) {
          // Process test curves for optimized clusters
          try {
            const response = await fetch('https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId: cluster.customer_id,
                curveCount: 3
              })
            })
            
            if (response.ok) {
              const result = await response.json()
              alert(`Successfully processed ${result.processed || 3} curves!`)
            } else {
              alert('Failed to process curves')
            }
          } catch (error) {
            console.error('Error processing curves:', error)
            alert('Error processing curves')
          }
        }
        break
      default:
        console.log(`Unhandled action: ${action}`)
    }
  }

  // Filter clusters based on search and filters
  const filteredClusters = clusters.filter(cluster => {
    const matchesSearch = !searchTerm || 
      cluster.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cluster.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cluster.cluster_key.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-5 h-5 text-emerald-400" />
      case 'offline': return <XCircle className="w-5 h-5 text-foreground/40" />
      case 'creating': return <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500/20 border-t-cyan-500" />
      case 'maintenance': return <Clock className="w-5 h-5 text-amber-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />
      case 'terminated': return <XCircle className="w-5 h-5 text-foreground/40" />
      default: return <ExclamationTriangle className="w-5 h-5 text-foreground/40" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'offline': return 'bg-foreground/5 text-foreground/60 border border-foreground/10'
      case 'creating': return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
      case 'maintenance': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
      case 'error': return 'bg-red-500/10 text-red-400 border border-red-500/20'
      case 'terminated': return 'bg-foreground/5 text-foreground/60 border border-foreground/10'
      default: return 'bg-foreground/5 text-foreground/60 border border-foreground/10'
    }
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const then = new Date(dateString)
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000)

    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getArchitectureIcon = (architecture: string) => {
    switch (architecture) {
      case 'optimized':
        return <ChartBar className="w-5 h-5 text-emerald-400" />
      case 'centcom':
        return <CircleStack className="w-5 h-5 text-cyan-400" />
      default:
        return <Server className="w-5 h-5 text-cyan-400" />
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'development': return <Play className="w-5 h-5 text-cyan-400" title="Development" />
      case 'staging': return <ChartBar className="w-5 h-5 text-amber-400" title="Staging" />
      case 'production': return <Server className="w-5 h-5 text-red-400" title="Production" />
      case 'analytics': return <ChartBar className="w-5 h-5 text-cyan-400" title="Analytics" />
      default: return <Cog6Tooth className="w-5 h-5 text-foreground/60" title={type} />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (showWizard) {
    return (
      <UnifiedClusterWizard
        onComplete={handleWizardComplete}
        onCancel={handleWizardCancel}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center">
                <CircleStack className="mr-3 h-8 w-8 text-cyan-400" />
                Clusters
              </h1>
              <p className="mt-2 text-foreground/60">
                Manage your traditional and optimized analytics clusters with comprehensive user and billing control
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={loadClusters}
                disabled={loading}
                className="btn-glass inline-flex items-center px-4 py-2"
              >
                <ArrowPath className="-ml-1 mr-2 h-5 w-5" />
                Refresh
              </button>
              <button
                onClick={() => router.push('/admin/test-cluster')}
                className="btn-glass inline-flex items-center px-4 py-2"
              >
                <WrenchScrewdriver className="-ml-1 mr-2 h-5 w-5" />
                Test Clusters
              </button>
              <button
                onClick={() => setShowWizard(true)}
                className="btn-primary inline-flex items-center px-4 py-2"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Create Cluster
              </button>
            </div>
          </div>
        </div>

        {/* Architecture Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-card p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CircleStack className="h-8 w-8 text-cyan-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground/60">Total Clusters</p>
                <p className="text-2xl font-semibold text-foreground">{filteredClusters.length}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBar className="h-8 w-8 text-emerald-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground/60">Optimized</p>
                <p className="text-2xl font-semibold text-emerald-400">
                  {filteredClusters.filter(c => c.architecture === 'optimized').length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Server className="h-8 w-8 text-cyan-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground/60">Traditional</p>
                <p className="text-2xl font-semibold text-cyan-400">
                  {filteredClusters.filter(c => c.architecture === 'traditional').length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CircleStack className="h-8 w-8 text-cyan-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground/60">CentCom</p>
                <p className="text-2xl font-semibold text-cyan-400">
                  {filteredClusters.filter(c => c.architecture === 'centcom').length}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollar className="h-8 w-8 text-cyan-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground/60">Monthly Cost</p>
                <p className="text-2xl font-semibold text-cyan-400">
                  ${filteredClusters.reduce((sum, c) => sum + c.estimated_monthly_cost, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card mb-6 p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/40 h-5 w-5" />
              <input
                type="text"
                placeholder="Search clusters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2 text-foreground placeholder-foreground/40"
              />
            </div>

            {/* Architecture Filter */}
            <select
              value={filterArchitecture}
              onChange={(e) => setFilterArchitecture(e.target.value as any)}
              className="glass-input px-3 py-2 text-foreground"
            >
              <option value="all">All Architectures</option>
              <option value="optimized">Optimized</option>
              <option value="traditional">Traditional</option>
              <option value="centcom">CentCom Local</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="glass-input px-3 py-2 text-foreground"
            >
              <option value="all">All Types</option>
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
              <option value="analytics">Analytics</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="glass-input px-3 py-2 text-foreground"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="creating">Creating</option>
              <option value="maintenance">Maintenance</option>
              <option value="error">Error</option>
              <option value="terminated">Terminated</option>
            </select>

            {/* Results Count */}
            <div className="flex items-center justify-center">
              <span className="text-sm text-foreground/60">
                <span className="font-medium">{filteredClusters.length}</span> clusters found
              </span>
            </div>
          </div>
        </div>

        {/* Clusters Table */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-cyan-500/10">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider w-16">
                    View
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider w-20">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider w-72">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider w-96">
                    Cluster Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Architecture
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider w-32">
                    Region
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Resources
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Users
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-foreground/60 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-cyan-500/10">
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500 mr-3" />
                        <span className="text-foreground/60">Loading clusters...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredClusters.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center">
                      {showSetupRequired ? (
                        <div className="text-center">
                          <CircleStack className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">Database Setup Required</h3>
                          <p className="text-foreground/60 mb-4">
                            The unified cluster system needs to be set up in your database.
                          </p>
                          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-4 mb-4 text-left max-w-2xl mx-auto">
                            <h4 className="font-medium text-cyan-400 mb-2">Quick Setup Instructions:</h4>
                            <ol className="text-sm text-foreground/60 space-y-1">
                              <li>1. Open your Supabase Dashboard</li>
                              <li>2. Go to SQL Editor</li>
                              <li>3. Copy and paste the SQL from <code>simplified-unified-cluster-setup.sql</code></li>
                              <li>4. Click "Run" to execute the setup</li>
                              <li>5. Refresh this page</li>
                            </ol>
                          </div>
                          <button
                            onClick={loadClusters}
                            className="btn-primary inline-flex items-center px-4 py-2"
                          >
                            <ArrowPath className="-ml-1 mr-2 h-5 w-5" />
                            Retry After Setup
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <CircleStack className="mx-auto h-12 w-12 text-foreground/40 mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">No clusters found</h3>
                          <p className="text-foreground/60 mb-4">
                            Get started by creating your first analytics cluster.
                          </p>
                          <button
                            onClick={() => setShowWizard(true)}
                            className="btn-primary inline-flex items-center px-4 py-2"
                          >
                            <Plus className="-ml-1 mr-2 h-5 w-5" />
                            Create Cluster
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredClusters.map((cluster) => (
                    <tr
                      key={cluster.id}
                      className={`hover:bg-cyan-500/5 ${
                        cluster.architecture === 'optimized' ? 'bg-emerald-500/5' :
                        cluster.architecture === 'centcom' ? 'bg-cyan-500/5' : ''
                      }`}
                    >
                      {/* View */}
                      <td className="px-4 py-4">
                        <button
                          onClick={() => window.location.href = `/admin/clusters/${cluster.cluster_key}`}
                          className="p-2 text-foreground/40 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-colors"
                          title="View cluster details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </td>

                      {/* Type Icon */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center">
                          {getTypeIcon(cluster.cluster_type)}
                        </div>
                      </td>

                      {/* Key */}
                      <td className="px-6 py-4">
                        <Badge
                          className={`text-sm font-mono whitespace-nowrap ${
                            cluster.architecture === 'optimized'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : cluster.architecture === 'centcom'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                          }`}
                        >
                          {cluster.cluster_key}
                        </Badge>
                      </td>

                      {/* Cluster Name */}
                      <td className="px-6 py-4">
                        <div className="whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">{cluster.name}</div>
                          <div className="text-sm text-foreground/60">{cluster.description}</div>
                        </div>
                      </td>

                      {/* Architecture */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <Badge
                            className={`${
                              cluster.architecture === 'optimized'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : cluster.architecture === 'centcom'
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}
                          >
                            {cluster.architecture}
                          </Badge>
                          {cluster.tier && (
                            <Badge className="ml-2 bg-foreground/5 text-foreground/60 border border-foreground/10 text-xs">
                              {cluster.tier}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Region */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground whitespace-nowrap">{cluster.region}</span>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(cluster.status)}
                          <Badge className={`ml-2 ${getStatusColor(cluster.status)}`}>
                            {cluster.status}
                          </Badge>
                        </div>
                        {cluster.architecture === 'centcom' && cluster.last_heartbeat_at && (
                          <div className="text-xs text-foreground/60 mt-1">
                            Last seen: {getTimeAgo(cluster.last_heartbeat_at)}
                          </div>
                        )}
                      </td>

                      {/* Resources */}
                      <td className="px-6 py-4 text-sm">
                        {cluster.architecture === 'traditional' ? (
                          <div>
                            <div className="flex items-center text-foreground/60">
                              <Server className="h-3 w-3 mr-1" />
                              {cluster.node_count} nodes
                            </div>
                            <div className="flex items-center text-foreground/60 mt-1">
                              <CpuChip className="h-3 w-3 mr-1" />
                              {cluster.cpu_per_node} CPU, {cluster.memory_per_node}
                            </div>
                          </div>
                        ) : cluster.architecture === 'centcom' ? (
                          <div>
                            <div className="flex items-center text-cyan-400">
                              <CircleStack className="h-3 w-3 mr-1" />
                              Local ClickHouse
                            </div>
                            {cluster.storage_used_gb !== undefined && (
                              <div className="text-xs text-foreground/60 mt-1">
                                {cluster.storage_used_gb.toFixed(2)} GB used
                              </div>
                            )}
                            {cluster.queries_this_month !== undefined && (
                              <div className="text-xs text-foreground/60">
                                {cluster.queries_this_month.toLocaleString()} queries/mo
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center text-emerald-400">
                              <ChartBar className="h-3 w-3 mr-1" />
                              Serverless
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Users */}
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center text-foreground/60">
                          <UsersIcon className="h-4 w-4 mr-1" />
                          <span>{cluster.current_assigned_users}/{cluster.max_assigned_users}</span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="px-6 py-4">
                        <div className={`text-sm font-medium ${
                          cluster.architecture === 'optimized' ? 'text-emerald-400' :
                          cluster.architecture === 'centcom' ? 'text-cyan-400' : 'text-cyan-400'
                        }`}>
                          ${cluster.estimated_monthly_cost.toLocaleString()}/mo
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-6 py-4 text-sm text-foreground">
                        {formatDate(cluster.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}