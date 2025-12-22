'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Gear as Settings,
  Users,
  CreditCard,
  ChartBar as BarChart3,
  Warning as AlertCircle,
  CheckCircle,
  UserPlus,
  Trash,
  CurrencyDollar as DollarSign,
  TrendUp as TrendingUp,
  Database,
  Desktop as Server,
  Shield,
  Clock,
  Eye,
  Play,
  ArrowsClockwise as Loader2,
  Gear as Cog
} from '@phosphor-icons/react'

interface ClusterDetails {
  id: string
  cluster_key: string
  name: string
  description?: string
  architecture: 'traditional' | 'optimized'
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
  connection_string?: string
  
  // Optimized cluster fields
  customer_id?: string
  monthly_curves_limit?: number
  storage_limit?: string
  processing_endpoint?: string
  tier_features?: string[]
  
  // Billing and cost
  classification: 'gratis' | 'trial' | 'enterprise'
  trial_start_date?: string
  trial_end_date?: string
  is_trial_expired?: boolean
  estimated_monthly_cost: number
  actual_monthly_cost?: number
  pricing_model: string
  responsible_user_id?: string
  
  // User assignment
  current_assigned_users: number
  max_assigned_users: number
  user_role: string
  assigned_users: any[]
  
  // Timestamps
  created_at: string
  updated_at: string
  
  // Settings and billing data
  settings: any[]
  billing_records: any[]
  recent_usage: any[]
}

export default function UnifiedClusterManagementPage() {
  const params = useParams()
  const router = useRouter()
  const { session } = useAuth()
  const [cluster, setCluster] = useState<ClusterDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [selectedUserEmail, setSelectedUserEmail] = useState('')
  const [newUserAccessLevel, setNewUserAccessLevel] = useState('user')
  const [addingUser, setAddingUser] = useState(false)
  const [newResponsibleUserId, setNewResponsibleUserId] = useState('')
  const [updatingBilling, setUpdatingBilling] = useState(false)
  const [processingCurves, setProcessingCurves] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingBasicInfo, setEditingBasicInfo] = useState(false)
  const [basicInfoForm, setBasicInfoForm] = useState({
    name: '',
    description: '',
    cluster_type: '',
    classification: 'enterprise' as 'gratis' | 'trial' | 'enterprise'
  })
  const [editingSettings, setEditingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    max_assigned_users: 0,
    auto_scaling_enabled: false,
    backup_enabled: true,
    backup_frequency: 'daily',
    maintenance_window: '02:00',
    security_level: 'standard',
    monitoring_enabled: true,
    alerts_enabled: true,
    log_retention_days: 30
  })

  useEffect(() => {
    if (session?.access_token) {
      loadClusterDetails()
      loadAvailableUsers()
    }
  }, [params.clusterKey, session?.access_token])

  useEffect(() => {
    if (cluster) {
      setBasicInfoForm({
        name: cluster.name,
        description: cluster.description || '',
        cluster_type: cluster.cluster_type,
        classification: cluster.classification || 'enterprise'
      })
      setSettingsForm({
        max_assigned_users: cluster.max_assigned_users,
        auto_scaling_enabled: false, // Default values
        backup_enabled: true,
        backup_frequency: 'daily',
        maintenance_window: '02:00',
        security_level: 'standard',
        monitoring_enabled: true,
        alerts_enabled: true,
        log_retention_days: 30
      })
    }
  }, [cluster])

  const loadClusterDetails = async () => {
    try {
      setLoading(true)

      if (!session?.access_token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/clusters/by-key/${params.clusterKey}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to load cluster details')
      }
      
      const data = await response.json()
      if (data.success) {
        setCluster(data.cluster)
        setNewResponsibleUserId(data.cluster.responsible_user_id || '')
      }
      
    } catch (error) {
      console.error('Failed to load cluster details:', error)
      alert('Failed to load cluster details')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      if (!session?.access_token) return

      const response = await fetch('/api/admin/users/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAvailableUsers(data.users || [])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    }
  }

  const handleAddUser = async () => {
    if (!selectedUserEmail || !cluster) return
    
    setAddingUser(true)
    
    try {
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      const response = await fetch(`/api/clusters/${cluster.id}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_email: selectedUserEmail,
          access_level: newUserAccessLevel
        })
      })

      if (response.ok) {
        await loadClusterDetails()
        setSelectedUserEmail('')
        setNewUserAccessLevel('user')
        alert('User added successfully')
      } else {
        const error = await response.json()
        alert(`Failed to add user: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to add user:', error)
      alert('Failed to add user')
    } finally {
      setAddingUser(false)
    }
  }

  const handleUpdateBilling = async () => {
    if (!newResponsibleUserId || !cluster) return
    
    setUpdatingBilling(true)
    
    try {
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      const response = await fetch(`/api/clusters/${cluster.id}/billing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          responsible_user_id: newResponsibleUserId
        })
      })

      if (response.ok) {
        await loadClusterDetails()
        alert('Billing settings updated successfully')
      } else {
        const error = await response.json()
        alert(`Failed to update billing: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update billing:', error)
      alert('Failed to update billing')
    } finally {
      setUpdatingBilling(false)
    }
  }

  const handleUpdateBasicInfo = async () => {
    if (!cluster) return

    try {
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      const response = await fetch(`/api/clusters/${cluster.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: basicInfoForm.name,
          description: basicInfoForm.description,
          cluster_type: basicInfoForm.cluster_type,
          classification: basicInfoForm.classification
        })
      })

      if (response.ok) {
        await loadClusterDetails()
        setEditingBasicInfo(false)
        alert('Basic information updated successfully')
      } else {
        const error = await response.json()
        alert(`Failed to update basic info: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update basic info:', error)
      alert('Failed to update basic info')
    }
  }

  const handleUpdateSettings = async () => {
    if (!cluster) return
    
    try {
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      const response = await fetch(`/api/clusters/${cluster.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          max_assigned_users: settingsForm.max_assigned_users,
          // Additional settings would be saved to a settings table in a real implementation
          settings: settingsForm
        })
      })

      if (response.ok) {
        await loadClusterDetails()
        setEditingSettings(false)
        alert('Settings updated successfully')
      } else {
        const error = await response.json()
        alert(`Failed to update settings: ${error.error}`)
      }
    } catch (error) {
      console.error('Failed to update settings:', error)
      alert('Failed to update settings')
    }
  }

  const handleProcessCurves = async () => {
    if (!cluster || cluster.architecture !== 'optimized' || !cluster.customer_id) {
      alert('This feature is only available for optimized clusters with a valid customer ID')
      return
    }
    
    setProcessingCurves(true)
    
    try {
      const response = await fetch('https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          customerId: cluster.customer_id,
          curveCount: 5
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`✅ Successfully processed ${result.processed || 5} curves!\n\nCustomer ID: ${cluster.customer_id}`)
        await loadClusterDetails() // Refresh usage data
      } else {
        const errorText = await response.text()
        console.error('Process curves error:', errorText)
        alert(`❌ Failed to process curves: ${response.status} ${response.statusText}\n\n${errorText.substring(0, 100)}`)
      }
    } catch (error: any) {
      console.error('Failed to process curves:', error)
      
      // Provide more detailed error messages
      if (error.message === 'Failed to fetch') {
        alert(`❌ Network Error: Could not connect to the processing endpoint.\n\nThis could mean:\n- The Cloud Function is not deployed or running\n- CORS is not configured properly\n- Network connectivity issues\n\nEndpoint: https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves`)
      } else {
        alert(`❌ Error: ${error.message}`)
      }
    } finally {
      setProcessingCurves(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
      case 'creating': return 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
      case 'maintenance': return 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
      case 'error': return 'text-red-400 bg-red-500/10 border border-red-500/20'
      case 'terminated': return 'text-foreground/60 bg-foreground/5 border border-foreground/10'
      default: return 'text-foreground/60 bg-foreground/5 border border-foreground/10'
    }
  }

  const getArchitectureIcon = () => {
    return cluster?.architecture === 'optimized'
      ? <ChartBar className="w-6 h-6 text-emerald-400" />
      : <Server className="w-6 h-6 text-cyan-400" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500/20 border-t-cyan-500 mr-3" />
          <span className="text-lg text-foreground">Loading cluster details...</span>
        </div>
      </div>
    )
  }

  if (!cluster) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Cluster Not Found</h2>
          <p className="text-foreground/60 mb-4">The requested cluster could not be found.</p>
          <button onClick={() => router.push('/admin/clusters')} className="btn-primary inline-flex items-center px-4 py-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clusters
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <button
                onClick={() => router.push('/admin/clusters')}
                className="btn-ghost shrink-0 inline-flex items-center px-4 py-2"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Clusters
              </button>

              <div className="flex items-start space-x-3">
                <div className="shrink-0 mt-1">
                  {getArchitectureIcon()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl lg:text-3xl font-bold text-foreground break-words">{cluster.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge className={getStatusColor(cluster.status)}>
                      {cluster.status}
                    </Badge>
                    <Badge className="bg-foreground/5 text-foreground/60 border border-foreground/10">
                      {cluster.cluster_key}
                    </Badge>
                    <Badge className={cluster.architecture === 'optimized' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}>
                      {cluster.architecture}
                    </Badge>
                    {cluster.tier && (
                      <Badge className="bg-foreground/5 text-foreground/60 border border-foreground/10">
                        {cluster.tier}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </div>

          {cluster.description && (
            <p className="text-foreground/60 mt-4 break-words">{cluster.description}</p>
          )}
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Database className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground/60">Region</p>
                <p className="text-2xl font-bold text-foreground">{cluster.region}</p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Users className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground/60">Users</p>
                <p className="text-2xl font-bold text-foreground">
                  {cluster.current_assigned_users}/{cluster.max_assigned_users}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground/60">Monthly Cost</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${cluster.estimated_monthly_cost.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center">
              <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                <Clock className="h-6 w-6 text-cyan-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-foreground/60">Created</p>
                <p className="text-lg font-bold text-foreground">
                  {new Date(cluster.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger
              value="overview"
              className={`${activeTab === 'overview' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : ''}`}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className={`${activeTab === 'users' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : ''}`}
            >
              Users
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className={`${activeTab === 'billing' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : ''}`}
            >
              Billing
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className={`${activeTab === 'settings' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : ''}`}
            >
              Settings
            </TabsTrigger>
            <TabsTrigger
              value="usage"
              className={`${activeTab === 'usage' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : ''}`}
            >
              Usage
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
            <div className="glass-card">
              <div className="p-6 border-b border-cyan-500/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground flex items-center">
                      <Settings className="w-5 h-5 mr-2 text-cyan-400" />
                      Basic Information
                    </h3>
                    <button
                      className="btn-ghost px-3 py-1 text-sm"
                      onClick={() => setEditingBasicInfo(!editingBasicInfo)}
                    >
                      {editingBasicInfo ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
              </div>
                <div className="p-6 space-y-4">
                  {editingBasicInfo ? (
                    <div className="space-y-4">
                  <div>
                        <Label htmlFor="cluster-name">Cluster Name</Label>
                      <Input
                          id="cluster-name"
                          value={basicInfoForm.name}
                          onChange={(e) => setBasicInfoForm({...basicInfoForm, name: e.target.value})}
                          placeholder="Enter cluster name"
                        />
                    </div>
                  <div>
                        <Label htmlFor="cluster-description">Description</Label>
                        <Textarea
                          id="cluster-description"
                          value={basicInfoForm.description}
                          onChange={(e) => setBasicInfoForm({...basicInfoForm, description: e.target.value})}
                          placeholder="Enter cluster description"
                          rows={3}
                        />
                    </div>
                  <div>
                        <Label htmlFor="cluster-type">Cluster Type</Label>
                        <Select
                          value={basicInfoForm.cluster_type}
                          onValueChange={(value) => setBasicInfoForm({...basicInfoForm, cluster_type: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select cluster type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="development">Development</SelectItem>
                            <SelectItem value="staging">Staging</SelectItem>
                            <SelectItem value="production">Production</SelectItem>
                            <SelectItem value="analytics">Analytics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                      <div>
                        <Label htmlFor="classification">Billing Classification</Label>
                        <Select
                          value={basicInfoForm.classification}
                          onValueChange={(value) => {
                            setBasicInfoForm({
                              ...basicInfoForm, 
                              classification: value as 'gratis' | 'trial' | 'enterprise'
                            })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gratis">
                              Gratis (Free)
                            </SelectItem>
                            <SelectItem value="trial">
                              Trial (30 Days)
                            </SelectItem>
                            <SelectItem value="enterprise">
                              Enterprise (Paid)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        {basicInfoForm.classification === 'gratis' && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ Free forever - no billing required
                          </p>
                        )}
                        {basicInfoForm.classification === 'trial' && cluster?.trial_end_date && (
                          <p className="text-xs text-blue-600 mt-1">
                            ℹ️ Trial ends: {new Date(cluster.trial_end_date).toLocaleDateString()}
                          </p>
                        )}
                        {basicInfoForm.classification === 'enterprise' && (
                          <p className="text-xs text-purple-600 mt-1">
                            💳 Requires billing - responsible user will be charged
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={handleUpdateBasicInfo} className="flex-1">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setEditingBasicInfo(false)
                            setBasicInfoForm({
                              name: cluster?.name || '',
                              description: cluster?.description || '',
                              cluster_type: cluster?.cluster_type || '',
                              classification: (cluster?.classification as 'gratis' | 'trial' | 'enterprise') || 'trial'
                            })
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-foreground/60">Cluster ID</Label>
                          <p className="font-mono text-base">{cluster.cluster_key}</p>
                        </div>
                        <div>
                          <Label className="text-foreground/60">Type</Label>
                          <p className="capitalize text-base">{cluster.cluster_type}</p>
                        </div>
                        <div>
                          <Label className="text-foreground/60">Architecture</Label>
                          <p className="capitalize text-base">{cluster.architecture}</p>
                        </div>
                        <div>
                          <Label className="text-foreground/60">Health Status</Label>
                          <p className={`text-base ${cluster.health_status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {cluster.health_status}
                          </p>
                        </div>
                        <div>
                          <Label className="text-foreground/60">Billing Classification</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={
                              cluster.classification === 'gratis' ? 'bg-green-100 text-green-800' :
                              cluster.classification === 'trial' ? 'bg-blue-100 text-blue-800' :
                              'bg-purple-100 text-purple-800'
                            }>
                              {cluster.classification === 'gratis' ? 'Gratis (Free)' :
                               cluster.classification === 'trial' ? 'Trial' :
                               'Enterprise'}
                            </Badge>
                            {cluster.classification === 'trial' && cluster.trial_end_date && (
                              <span className="text-xs text-foreground/60">
                                {cluster.is_trial_expired ? '(Expired)' : `Ends ${new Date(cluster.trial_end_date).toLocaleDateString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-foreground/60">Description</Label>
                          <p className="text-base text-foreground">{cluster.description || 'No description provided'}</p>
                        </div>
                      </div>

                      {/* Connection Information */}
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="font-medium text-foreground mb-3">Connection Information</h4>
                        <div className="space-y-3">
                          {cluster.architecture === 'optimized' ? (
                            <>
                              <div>
                                <Label className="text-foreground/60">Processing Endpoint</Label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1">
                                    {cluster.processing_endpoint || 'https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves'}
                                  </code>
                                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(cluster.processing_endpoint || '')}>
                                    Copy
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label className="text-foreground/60">Customer ID</Label>
                                <div className="flex items-center space-x-2 mt-1">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1">
                                    {cluster.customer_id}
                                  </code>
                                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(cluster.customer_id || '')}>
                                    Copy
                                  </Button>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div>
                              <Label className="text-foreground/60">Connection String</Label>
                              <div className="flex items-center space-x-2 mt-1">
                                <code className="bg-gray-100 px-2 py-1 rounded text-sm flex-1">
                                  {cluster.connection_string || 'Connection string not available'}
                                </code>
                                <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(cluster.connection_string || '')}>
                                  Copy
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Resource Configuration */}
            <div className="glass-card">
              <div className="p-6 border-b border-cyan-500/10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    {cluster.architecture === 'optimized' ? (
                      <Zap className="w-5 h-5 mr-2 text-green-600" />
                    ) : (
                      <Server className="w-5 h-5 mr-2 text-blue-600" />
                    )}
                    {cluster.architecture === 'optimized' ? 'Optimized' : 'Traditional'} Configuration
                  </h3>
              </div>
                <div className="p-6 space-y-4">
                  {cluster.architecture === 'optimized' ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <Label className="text-foreground/60">Tier</Label>
                        <p className="capitalize font-medium">{cluster.tier}</p>
                    </div>
                    <div>
                        <Label className="text-foreground/60">Monthly Curves</Label>
                        <p className="font-medium">{cluster.monthly_curves_limit?.toLocaleString()}</p>
                    </div>
                      <div>
                        <Label className="text-foreground/60">Storage Limit</Label>
                        <p className="font-medium">{cluster.storage_limit}</p>
                  </div>
                    <div>
                        <Label className="text-foreground/60">Processing</Label>
                        <p className="font-medium text-green-600">Serverless</p>
                    </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <Label className="text-foreground/60">Nodes</Label>
                        <p className="font-medium">{cluster.node_count}</p>
                      </div>
                      <div>
                        <Label className="text-foreground/60">CPU per Node</Label>
                        <p className="font-medium">{cluster.cpu_per_node}</p>
                    </div>
                      <div>
                        <Label className="text-foreground/60">Memory per Node</Label>
                        <p className="font-medium">{cluster.memory_per_node}</p>
                  </div>
                      <div>
                        <Label className="text-foreground/60">Storage per Node</Label>
                        <p className="font-medium">{cluster.storage_per_node}</p>
                </div>
                    </div>
                  )}
              </div>
            </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add User */}
            <div className="glass-card">
              <div className="p-6 border-b border-cyan-500/10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Add User
                </h3>
              </div>
                <div className="p-6 space-y-4">
                  <div>
                    <Label>User Email</Label>
                    <Select
                      value={selectedUserEmail}
                      onValueChange={setSelectedUserEmail}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers
                          .filter(user => !cluster.assigned_users.some(assigned => assigned.user_profiles?.email === user.email))
                          .map((user) => (
                            <SelectItem key={user.id} value={user.email}>
                              {user.full_name || user.email} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                      </div>
                  
                  <div>
                    <Label>Access Level</Label>
                    <Select
                      value={newUserAccessLevel}
                      onValueChange={setNewUserAccessLevel}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="analyst">Analyst</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                    <Button 
                      onClick={handleAddUser}
                    disabled={!selectedUserEmail || addingUser}
                      className="w-full"
                    >
                    {addingUser ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4 mr-2" />
                    )}
                    Add User
                    </Button>
              </div>
            </div>

              {/* Current Users */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      <Users className="w-5 h-5 mr-2" />
                      Assigned Users ({cluster.current_assigned_users})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cluster.assigned_users.length === 0 ? (
                      <p className="text-foreground/60">No users assigned to this cluster.</p>
                    ) : (
                      cluster.assigned_users.map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-foreground/5 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                              <p className="font-medium">
                                {assignment.user_profiles?.full_name || assignment.user_profiles?.email}
                              </p>
                              <p className="text-sm text-foreground/60">
                                {assignment.user_profiles?.email} • {assignment.access_level}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {assignment.access_level}
                            </Badge>
                            {assignment.access_level !== 'owner' && (
                              <Button size="sm" variant="ghost" className="text-red-600">
                                <Trash2 className="w-4 h-4" />
                        </Button>
                            )}
                      </div>
                  </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Billing Settings */}
            <div className="glass-card">
              <div className="p-6 border-b border-cyan-500/10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Billing Settings
                </h3>
              </div>
                <div className="p-6 space-y-4">
                  <div>
                    <Label>Responsible User (Who pays for this cluster)</Label>
                    <Select
                      value={newResponsibleUserId}
                      onValueChange={setNewResponsibleUserId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select responsible user..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name || user.email} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                      </div>
                      
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-start space-x-3">
                      <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-800">Billing Responsibility</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          The selected user will be charged ${cluster.estimated_monthly_cost.toLocaleString()}/month 
                          for this cluster and will receive billing statements.
                        </p>
                      </div>
                      </div>
                    </div>
                    
                  <Button
                    onClick={handleUpdateBilling}
                    disabled={!newResponsibleUserId || updatingBilling || newResponsibleUserId === cluster.responsible_user_id}
                    className="w-full"
                  >
                    {updatingBilling ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="w-4 h-4 mr-2" />
                    )}
                    Update Billing Settings
                  </Button>
                </div>
              </div>

              {/* Cost Summary */}
              <div className="glass-card">
                <div className="p-6 border-b border-cyan-500/10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Cost Summary
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                      <div className="flex justify-between">
                      <span className="text-foreground/60">Architecture:</span>
                      <Badge className={cluster.architecture === 'optimized' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {cluster.architecture}
                      </Badge>
                  </div>
                  
                      <div className="flex justify-between">
                      <span className="text-foreground/60">Estimated Monthly Cost:</span>
                      <span className="font-bold text-lg text-green-600">
                        ${cluster.estimated_monthly_cost.toLocaleString()}
                      </span>
                    </div>
                    
                    {cluster.architecture === 'optimized' && (
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-sm text-green-800 font-medium">
                          💰 You're saving 85% vs traditional clusters!
                      </div>
                        <div className="text-xs text-green-700 mt-1">
                          Traditional equivalent: ~$2,000/month
                      </div>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-foreground/60">Pricing Model:</span>
                      <span className="font-medium capitalize">{cluster.pricing_model}</span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* General Settings */}
            <div className="glass-card">
              <div className="p-6 border-b border-cyan-500/10">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      General Settings
                </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSettings(!editingSettings)}
                    >
                      {editingSettings ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
              </div>
                <div className="p-6 space-y-4">
                  {editingSettings ? (
                    <div className="space-y-4">
                  <div>
                        <Label htmlFor="max-users">Maximum Assigned Users</Label>
                      <Input
                          id="max-users"
                        type="number"
                          value={settingsForm.max_assigned_users}
                          onChange={(e) => setSettingsForm({...settingsForm, max_assigned_users: parseInt(e.target.value)})}
                        min="1"
                          max="1000"
                      />
                  </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="auto-scaling"
                          checked={settingsForm.auto_scaling_enabled}
                          onChange={(e) => setSettingsForm({...settingsForm, auto_scaling_enabled: e.target.checked})}
                          className="rounded"
                        />
                        <Label htmlFor="auto-scaling">Enable Auto-scaling</Label>
                  </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="monitoring"
                          checked={settingsForm.monitoring_enabled}
                          onChange={(e) => setSettingsForm({...settingsForm, monitoring_enabled: e.target.checked})}
                          className="rounded"
                        />
                        <Label htmlFor="monitoring">Enable Monitoring</Label>
                  </div>

                  <div>
                        <Label htmlFor="security-level">Security Level</Label>
                        <Select
                          value={settingsForm.security_level}
                          onValueChange={(value) => setSettingsForm({...settingsForm, security_level: value})}
                        >
                          <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="enhanced">Enhanced</SelectItem>
                            <SelectItem value="maximum">Maximum</SelectItem>
                        </SelectContent>
                      </Select>
                </div>

                      <div className="flex space-x-2">
                        <Button onClick={handleUpdateSettings} className="flex-1">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save Settings
                        </Button>
                  <Button 
                          variant="outline" 
                          onClick={() => setEditingSettings(false)}
                  >
                          Cancel
                  </Button>
                </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label className="text-foreground/60">Maximum Assigned Users</Label>
                          <p className="text-base font-medium">{cluster.max_assigned_users}</p>
                    </div>
                        <div>
                          <Label className="text-foreground/60">Auto-scaling</Label>
                          <div className="text-base">
                            <Badge variant={settingsForm.auto_scaling_enabled ? "default" : "secondary"}>
                              {settingsForm.auto_scaling_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                    </div>
                    </div>
                        <div>
                          <Label className="text-foreground/60">Monitoring</Label>
                          <div className="text-base">
                            <Badge variant={settingsForm.monitoring_enabled ? "default" : "secondary"}>
                              {settingsForm.monitoring_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                    </div>
                  </div>
                        <div>
                          <Label className="text-foreground/60">Security Level</Label>
                          <div className="text-base capitalize">
                            <Badge className={
                              settingsForm.security_level === 'maximum' ? 'bg-red-100 text-red-800' :
                              settingsForm.security_level === 'enhanced' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {settingsForm.security_level}
                            </Badge>
                </div>
                    </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

              {/* Backup & Maintenance Settings */}
            <div className="glass-card">
              <div className="p-6 border-b border-cyan-500/10">
                  <h3 className="text-lg font-semibold text-foreground flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Backup & Maintenance
                  </h3>
              </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-foreground/60">Automated Backups</Label>
                      <div className="text-base">
                        <Badge variant={settingsForm.backup_enabled ? "default" : "secondary"}>
                          {settingsForm.backup_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                  </div>
                  </div>
                    <div>
                      <Label className="text-foreground/60">Backup Frequency</Label>
                      <p className="text-base capitalize">{settingsForm.backup_frequency}</p>
                </div>
                    <div>
                      <Label className="text-foreground/60">Maintenance Window</Label>
                      <p className="text-base font-mono">{settingsForm.maintenance_window} UTC</p>
                </div>
                    <div>
                      <Label className="text-foreground/60">Log Retention</Label>
                      <p className="text-base">{settingsForm.log_retention_days} days</p>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Advanced Settings */}
            <div className="glass-card">
              <div className="p-6 border-b border-cyan-500/10">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <Cog className="w-5 h-5 mr-2" />
                  Advanced Configuration
                </h3>
                <p className="text-sm text-foreground/60 mt-1">
                  Advanced settings for power users. Changes here may affect cluster performance.
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Advanced Settings</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        These settings control low-level cluster behavior. Only modify if you understand the implications.
                        {cluster.architecture === 'optimized' && (
                          <span className="block mt-2">
                            For optimized clusters, most advanced settings are managed automatically by our serverless infrastructure.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {cluster.architecture === 'traditional' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                      <Label className="text-foreground/60">Connection Pool Size</Label>
                      <p className="text-base">100</p>
                      </div>
                    <div>
                      <Label className="text-foreground/60">Query Timeout</Label>
                      <p className="text-base">30 seconds</p>
                    </div>
                    <div>
                      <Label className="text-foreground/60">Memory Allocation</Label>
                      <p className="text-base">Auto-managed</p>
                  </div>
                    <div>
                      <Label className="text-foreground/60">Cache Size</Label>
                      <p className="text-base">2 GB</p>
                                </div>
                        </div>
                      )}
                
                {cluster.architecture === 'optimized' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-foreground/60">Function Timeout</Label>
                      <p className="text-base">540 seconds</p>
                    </div>
                    <div>
                      <Label className="text-foreground/60">Memory per Invocation</Label>
                      <p className="text-base">2 GB</p>
                  </div>
                    <div>
                      <Label className="text-foreground/60">Concurrent Executions</Label>
                      <p className="text-base">1000</p>
                  </div>
                    <div>
                      <Label className="text-foreground/60">Cold Start Optimization</Label>
                      <p className="text-base">Enabled</p>
                  </div>
                </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <div className="glass-card">
              <div className="p-6 border-b border-cyan-500/10">
                <h3 className="text-lg font-semibold text-foreground flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Usage Analytics
                </h3>
                <p className="text-sm text-foreground/60 mt-1">
                  Monitor cluster usage, performance metrics, and resource consumption
                </p>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    📊 Detailed usage analytics and reporting interface coming soon. 
                    This will include real-time metrics, historical trends, and cost breakdowns.
                                  </p>
                                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Analytics Dashboard
                                </Button>
                  
                  {cluster.architecture === 'optimized' && (
                                <Button
                      onClick={handleProcessCurves} 
                      disabled={processingCurves}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingCurves ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Process Test Curves
                                </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
