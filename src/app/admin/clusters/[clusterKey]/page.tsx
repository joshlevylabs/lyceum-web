'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Settings, 
  Users, 
  CreditCard, 
  BarChart3, 
  AlertCircle,
  CheckCircle,
  UserPlus,
  Trash2,
  DollarSign,
  TrendingUp,
  Database,
  Zap,
  Server,
  Shield,
  Clock,
  Eye,
  Play,
  Loader2,
  Cog
} from 'lucide-react'

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
      loadClusterDetails()
    loadAvailableUsers()
  }, [params.clusterKey])

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
      
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/clusters/by-key/${params.clusterKey}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
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
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token

      if (!accessToken) return

      const response = await fetch('/api/admin/users/list', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
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
      case 'active': return 'text-green-600 bg-green-100'
      case 'creating': return 'text-blue-600 bg-blue-100'
      case 'maintenance': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'terminated': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getArchitectureIcon = () => {
    return cluster?.architecture === 'optimized' 
      ? <Zap className="w-6 h-6 text-green-600" />
      : <Server className="w-6 h-6 text-blue-600" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center">
          <Loader2 className="h-8 w-8 animate-spin mr-3" />
          <span className="text-lg">Loading cluster details...</span>
        </div>
      </div>
    )
  }

  if (!cluster) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cluster Not Found</h2>
          <p className="text-gray-600 mb-4">The requested cluster could not be found.</p>
          <Button onClick={() => router.push('/admin/clusters')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clusters
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin/clusters')}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clusters
              </Button>
              
              <div className="flex items-start space-x-3">
                <div className="shrink-0 mt-1">
                  {getArchitectureIcon()}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 break-words">{cluster.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge className={getStatusColor(cluster.status)}>
                      {cluster.status}
                    </Badge>
                    <Badge variant="secondary">
                      {cluster.cluster_key}
                    </Badge>
                    <Badge className={cluster.architecture === 'optimized' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                      {cluster.architecture}
                    </Badge>
                    {cluster.tier && (
                      <Badge variant="outline">
                        {cluster.tier}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
        </div>

          {cluster.description && (
            <p className="text-gray-600 mt-4 break-words">{cluster.description}</p>
          )}
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Region</p>
                  <p className="text-2xl font-bold text-gray-900">{cluster.region}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Users</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {cluster.current_assigned_users}/{cluster.max_assigned_users}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Monthly Cost</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${cluster.estimated_monthly_cost.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Created</p>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(cluster.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger 
              value="overview" 
              className={`${activeTab === 'overview' ? 'bg-blue-600 text-white' : ''}`}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className={`${activeTab === 'users' ? 'bg-blue-600 text-white' : ''}`}
            >
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="billing"
              className={`${activeTab === 'billing' ? 'bg-blue-600 text-white' : ''}`}
            >
              Billing
            </TabsTrigger>
            <TabsTrigger 
              value="settings"
              className={`${activeTab === 'settings' ? 'bg-blue-600 text-white' : ''}`}
            >
              Settings
            </TabsTrigger>
            <TabsTrigger 
              value="usage"
              className={`${activeTab === 'usage' ? 'bg-blue-600 text-white' : ''}`}
            >
              Usage
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Basic Information */}
            <Card>
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      Basic Information
                </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingBasicInfo(!editingBasicInfo)}
                    >
                      {editingBasicInfo ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
              </CardHeader>
                <CardContent className="space-y-4">
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
                          <Label className="text-gray-500">Cluster ID</Label>
                          <p className="font-mono text-base">{cluster.cluster_key}</p>
                    </div>
                        <div>
                          <Label className="text-gray-500">Type</Label>
                          <p className="capitalize text-base">{cluster.cluster_type}</p>
                  </div>
                        <div>
                          <Label className="text-gray-500">Architecture</Label>
                          <p className="capitalize text-base">{cluster.architecture}</p>
                </div>
                        <div>
                          <Label className="text-gray-500">Health Status</Label>
                          <p className={`text-base ${cluster.health_status === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {cluster.health_status}
                          </p>
                    </div>
                        <div>
                          <Label className="text-gray-500">Billing Classification</Label>
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
                              <span className="text-xs text-gray-500">
                                {cluster.is_trial_expired ? '(Expired)' : `Ends ${new Date(cluster.trial_end_date).toLocaleDateString()}`}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-gray-500">Description</Label>
                          <p className="text-base text-gray-900">{cluster.description || 'No description provided'}</p>
                  </div>
                </div>

                      {/* Connection Information */}
                      <div className="mt-6 pt-4 border-t">
                        <h4 className="font-medium text-gray-900 mb-3">Connection Information</h4>
                        <div className="space-y-3">
                          {cluster.architecture === 'optimized' ? (
                            <>
                              <div>
                                <Label className="text-gray-500">Processing Endpoint</Label>
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
                                <Label className="text-gray-500">Customer ID</Label>
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
                              <Label className="text-gray-500">Connection String</Label>
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
                </CardContent>
              </Card>

              {/* Resource Configuration */}
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center">
                    {cluster.architecture === 'optimized' ? (
                      <Zap className="w-5 h-5 mr-2 text-green-600" />
                    ) : (
                      <Server className="w-5 h-5 mr-2 text-blue-600" />
                    )}
                    {cluster.architecture === 'optimized' ? 'Optimized' : 'Traditional'} Configuration
                  </CardTitle>
              </CardHeader>
                <CardContent className="space-y-4">
                  {cluster.architecture === 'optimized' ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <Label className="text-gray-500">Tier</Label>
                        <p className="capitalize font-medium">{cluster.tier}</p>
                    </div>
                    <div>
                        <Label className="text-gray-500">Monthly Curves</Label>
                        <p className="font-medium">{cluster.monthly_curves_limit?.toLocaleString()}</p>
                    </div>
                      <div>
                        <Label className="text-gray-500">Storage Limit</Label>
                        <p className="font-medium">{cluster.storage_limit}</p>
                  </div>
                    <div>
                        <Label className="text-gray-500">Processing</Label>
                        <p className="font-medium text-green-600">Serverless</p>
                    </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <Label className="text-gray-500">Nodes</Label>
                        <p className="font-medium">{cluster.node_count}</p>
                      </div>
                      <div>
                        <Label className="text-gray-500">CPU per Node</Label>
                        <p className="font-medium">{cluster.cpu_per_node}</p>
                    </div>
                      <div>
                        <Label className="text-gray-500">Memory per Node</Label>
                        <p className="font-medium">{cluster.memory_per_node}</p>
                  </div>
                      <div>
                        <Label className="text-gray-500">Storage per Node</Label>
                        <p className="font-medium">{cluster.storage_per_node}</p>
                </div>
                    </div>
                  )}
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add User */}
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Add User
                </CardTitle>
              </CardHeader>
                <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

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
                      <p className="text-gray-500">No users assigned to this cluster.</p>
                    ) : (
                      cluster.assigned_users.map((assignment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                              <p className="font-medium">
                                {assignment.user_profiles?.full_name || assignment.user_profiles?.email}
                              </p>
                              <p className="text-sm text-gray-500">
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
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Billing Settings
                </CardTitle>
              </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
              </Card>

              {/* Cost Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Cost Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                      <div className="flex justify-between">
                      <span className="text-gray-600">Architecture:</span>
                      <Badge className={cluster.architecture === 'optimized' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                        {cluster.architecture}
                      </Badge>
                  </div>
                  
                      <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Monthly Cost:</span>
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
                      <span className="text-gray-600">Pricing Model:</span>
                      <span className="font-medium capitalize">{cluster.pricing_model}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* General Settings */}
            <Card>
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Settings className="w-5 h-5 mr-2" />
                      General Settings
                </CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingSettings(!editingSettings)}
                    >
                      {editingSettings ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
              </CardHeader>
                <CardContent className="space-y-4">
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
                          <Label className="text-gray-500">Maximum Assigned Users</Label>
                          <p className="text-base font-medium">{cluster.max_assigned_users}</p>
                    </div>
                        <div>
                          <Label className="text-gray-500">Auto-scaling</Label>
                          <div className="text-base">
                            <Badge variant={settingsForm.auto_scaling_enabled ? "default" : "secondary"}>
                              {settingsForm.auto_scaling_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                    </div>
                    </div>
                        <div>
                          <Label className="text-gray-500">Monitoring</Label>
                          <div className="text-base">
                            <Badge variant={settingsForm.monitoring_enabled ? "default" : "secondary"}>
                              {settingsForm.monitoring_enabled ? "Enabled" : "Disabled"}
                            </Badge>
                    </div>
                  </div>
                        <div>
                          <Label className="text-gray-500">Security Level</Label>
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
              </CardContent>
            </Card>

              {/* Backup & Maintenance Settings */}
            <Card>
              <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Backup & Maintenance
                  </CardTitle>
              </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-500">Automated Backups</Label>
                      <div className="text-base">
                        <Badge variant={settingsForm.backup_enabled ? "default" : "secondary"}>
                          {settingsForm.backup_enabled ? "Enabled" : "Disabled"}
                        </Badge>
                  </div>
                  </div>
                    <div>
                      <Label className="text-gray-500">Backup Frequency</Label>
                      <p className="text-base capitalize">{settingsForm.backup_frequency}</p>
                </div>
                    <div>
                      <Label className="text-gray-500">Maintenance Window</Label>
                      <p className="text-base font-mono">{settingsForm.maintenance_window} UTC</p>
                </div>
                    <div>
                      <Label className="text-gray-500">Log Retention</Label>
                      <p className="text-base">{settingsForm.log_retention_days} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>

            {/* Advanced Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Cog className="w-5 h-5 mr-2" />
                  Advanced Configuration
                </CardTitle>
                <CardDescription>
                  Advanced settings for power users. Changes here may affect cluster performance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      <Label className="text-gray-500">Connection Pool Size</Label>
                      <p className="text-base">100</p>
                      </div>
                    <div>
                      <Label className="text-gray-500">Query Timeout</Label>
                      <p className="text-base">30 seconds</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Memory Allocation</Label>
                      <p className="text-base">Auto-managed</p>
                  </div>
                    <div>
                      <Label className="text-gray-500">Cache Size</Label>
                      <p className="text-base">2 GB</p>
                                </div>
                        </div>
                      )}
                
                {cluster.architecture === 'optimized' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-gray-500">Function Timeout</Label>
                      <p className="text-base">540 seconds</p>
                    </div>
                    <div>
                      <Label className="text-gray-500">Memory per Invocation</Label>
                      <p className="text-base">2 GB</p>
                  </div>
                    <div>
                      <Label className="text-gray-500">Concurrent Executions</Label>
                      <p className="text-base">1000</p>
                  </div>
                    <div>
                      <Label className="text-gray-500">Cold Start Optimization</Label>
                      <p className="text-base">Enabled</p>
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  Usage Analytics
                </CardTitle>
                <CardDescription>
                  Monitor cluster usage, performance metrics, and resource consumption
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
