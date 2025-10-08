'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Zap, 
  Server, 
  Users, 
  DollarSign, 
  Settings,
  Eye,
  Brain,
  Cloud,
  Shield,
  Clock,
  ChevronRight,
  UserPlus,
  CreditCard,
  Loader2
} from 'lucide-react'
import { OPTIMIZED_TIERS, OptimizedClusterService } from '@/services/optimizedClusterService'

interface UnifiedClusterWizardProps {
  onComplete: (cluster: any) => void
  onCancel: () => void
}

interface ClusterConfig {
  // Basic information
  name: string
  description: string
  architecture: 'traditional' | 'optimized' | null
  cluster_type: 'development' | 'staging' | 'production' | 'analytics'
  region: string
  
  // Classification and billing
  classification: 'gratis' | 'trial' | 'enterprise'
  responsible_user_id: string
  max_assigned_users: number
  assigned_users: string[]
  
  // Traditional configuration
  traditional_config?: {
    nodes: number
    cpu_per_node: number
    memory_per_node: string
    storage_per_node: string
    hot_tier_size: string
    warm_tier_size: string
    cold_tier_size: string
    retention_policy: {
      hot_days: number
      warm_days: number
      cold_days: number
      archive_enabled: boolean
    }
  }
  
  // Optimized configuration
  optimized_config?: {
    tier: 'micro' | 'starter' | 'professional' | 'enterprise'
    monthly_curves_limit: number
    storage_limit: string
    customer_id?: string
  }
  
  // Pricing
  pricing_model: 'free' | 'trial' | 'paid' | 'optimized'
  estimated_monthly_cost: number
}

export const UnifiedClusterWizard: React.FC<UnifiedClusterWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCreating, setIsCreating] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  
  const [config, setConfig] = useState<ClusterConfig>({
    name: '',
    description: '',
    architecture: null,
    cluster_type: 'development',
    region: 'us-east-1',
    classification: 'enterprise',
    responsible_user_id: '',
    max_assigned_users: 10,
    assigned_users: [],
    pricing_model: 'paid',
    estimated_monthly_cost: 0
  })

  // Load available users for assignment
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoadingUsers(true)
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
    } finally {
      setLoadingUsers(false)
    }
  }

  const updateConfig = (updates: Partial<ClusterConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const calculateCost = () => {
    if (config.architecture === 'optimized' && config.optimized_config) {
      const tier = OPTIMIZED_TIERS.find(t => t.id === config.optimized_config?.tier)
      return tier?.price || 0
    }
    
    if (config.architecture === 'traditional' && config.traditional_config) {
      const { nodes, cpu_per_node, memory_per_node, storage_per_node } = config.traditional_config
      
      // Ensure all values are defined before calculating
      if (!nodes || !cpu_per_node || !memory_per_node || !storage_per_node) {
        return 0
      }
      
      const cpuCost = nodes * cpu_per_node * 15
      const memoryCost = nodes * parseInt(memory_per_node.replace('GB', '')) * 2
      const storageCost = nodes * parseInt(storage_per_node.replace('GB', '')) * 0.5
      return cpuCost + memoryCost + storageCost
    }
    
    return 0
  }

  useEffect(() => {
    const cost = calculateCost()
    updateConfig({ estimated_monthly_cost: cost })
  }, [config.architecture, config.traditional_config, config.optimized_config])

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = async () => {
    setIsCreating(true)
    
    try {
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        throw new Error('Authentication required')
      }
      
      const payload = {
        name: config.name,
        description: config.description,
        architecture: config.architecture,
        cluster_type: config.cluster_type,
        region: config.region,
        classification: config.classification,
        responsible_user_id: config.classification === 'gratis' ? null : config.responsible_user_id,
        max_assigned_users: config.max_assigned_users,
        pricing_model: config.pricing_model,
        estimated_monthly_cost: config.estimated_monthly_cost,
        // Send the config object with the correct key
        ...(config.architecture === 'traditional' ? { traditional_config: config.traditional_config } : {}),
        ...(config.architecture === 'optimized' ? { optimized_config: config.optimized_config } : {})
      }
      
      const response = await fetch('/api/clusters', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create cluster')
      }
      
      const result = await response.json()
      
      // Assign additional users if specified
      if (config.assigned_users.length > 0) {
        for (const userEmail of config.assigned_users) {
          try {
            await fetch(`/api/clusters/${result.cluster.id}/users`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                user_email: userEmail,
                access_level: 'user'
              })
            })
          } catch (error) {
            console.error(`Failed to assign user ${userEmail}:`, error)
          }
        }
      }
      
      onComplete(result.cluster)
      
    } catch (error) {
      console.error('Failed to create cluster:', error)
      alert(`Failed to create cluster: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return config.architecture !== null
      case 1:
        return config.name.trim() !== '' && config.cluster_type && config.region
      case 2:
        if (config.architecture === 'traditional') {
          return !!(
            config.traditional_config &&
            config.traditional_config.nodes &&
            config.traditional_config.cpu_per_node &&
            config.traditional_config.memory_per_node
            // storage_per_node has default value, not user-editable
          )
        }
        if (config.architecture === 'optimized') {
          return config.optimized_config !== undefined
        }
        return false
      case 3:
        // For gratis clusters, responsible_user_id is not required
        if (config.classification === 'gratis') {
          return true
        }
        // For trial and enterprise, responsible_user_id is required
        return config.responsible_user_id !== ''
      case 4:
        return true // User assignment is optional
      case 5:
        return true // Review step
      default:
        return false
    }
  }

  // Step 0: Architecture Selection
  const renderArchitectureStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Cluster Architecture
        </h2>
        <p className="text-lg text-gray-600">
          Select the deployment model that best fits your needs and budget
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Traditional Architecture */}
        <Card 
          className={`cursor-pointer transition-all duration-200 ${
            config.architecture === 'traditional' ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
          }`}
          onClick={() => updateConfig({ architecture: 'traditional' })}
        >
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Server className="w-8 h-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Traditional Cluster</CardTitle>
            <CardDescription>
              Dedicated infrastructure with full control and configurability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">Dedicated compute resources</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">Full infrastructure control</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">Advanced networking options</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">Custom retention policies</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Starting at:</div>
              <div className="text-2xl font-bold text-gray-900">$500-2000/month</div>
              <div className="text-sm text-gray-600">Always-on dedicated resources</div>
            </div>
          </CardContent>
        </Card>

        {/* Optimized Architecture */}
        <Card 
          className={`cursor-pointer transition-all duration-200 relative ${
            config.architecture === 'optimized' ? 'ring-2 ring-green-500 shadow-lg' : 'hover:shadow-md'
          }`}
          onClick={() => updateConfig({ architecture: 'optimized' })}
        >
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-green-500 text-white px-3 py-1">
              <Zap className="w-3 h-3 mr-1" />
              Recommended
            </Badge>
          </div>
          
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Optimized Cluster</CardTitle>
            <CardDescription>
              AI-optimized serverless processing with 85% cost savings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">Serverless auto-scaling</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">Intelligent storage lifecycle</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">5-minute deployment</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-sm">Pay-per-use pricing</span>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 mb-2">Starting at:</div>
              <div className="text-2xl font-bold text-green-800">$10-449/month</div>
              <div className="text-sm text-green-600 font-medium">85% cost savings</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  // Step 1: Basic Configuration
  const renderBasicConfigStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Basic Configuration
        </h2>
        <p className="text-gray-600">
          Configure the basic settings for your {config.architecture} cluster
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Cluster Name *</Label>
          <Input
            id="name"
            value={config.name}
            onChange={(e) => updateConfig({ name: e.target.value })}
            placeholder="e.g., production-analytics"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cluster_type">Cluster Type *</Label>
          <Select
            value={config.cluster_type}
            onValueChange={(value: any) => updateConfig({ cluster_type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="analytics">Analytics</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">Region *</Label>
          <Select
            value={config.region}
            onValueChange={(value) => updateConfig({ region: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
              <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
              <SelectItem value="us-central1">US Central (Iowa)</SelectItem>
              <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
              <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="classification">Billing Classification *</Label>
          <Select
            value={config.classification}
            onValueChange={(value: 'gratis' | 'trial' | 'enterprise') => {
              updateConfig({ 
                classification: value,
                // Clear responsible user for gratis
                responsible_user_id: value === 'gratis' ? '' : config.responsible_user_id
              })
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gratis">
                <div className="flex items-center">
                  <span className="font-medium">Gratis</span>
                  <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Free</Badge>
                </div>
              </SelectItem>
              <SelectItem value="trial">
                <div className="flex items-center">
                  <span className="font-medium">Trial</span>
                  <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">30 Days</Badge>
                </div>
              </SelectItem>
              <SelectItem value="enterprise">
                <div className="flex items-center">
                  <span className="font-medium">Enterprise</span>
                  <Badge variant="secondary" className="ml-2 bg-purple-100 text-purple-800">Paid</Badge>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {config.classification === 'gratis' && (
            <p className="text-sm text-green-600 mt-1">
              ✓ No billing required - completely free
            </p>
          )}
          {config.classification === 'trial' && (
            <p className="text-sm text-blue-600 mt-1">
              ℹ️ 30-day trial period before billing begins
            </p>
          )}
          {config.classification === 'enterprise' && (
            <p className="text-sm text-purple-600 mt-1">
              💳 Paid tier - requires responsible user for billing
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_users">Max Users</Label>
          <Input
            id="max_users"
            type="number"
            value={config.max_assigned_users}
            onChange={(e) => updateConfig({ max_assigned_users: parseInt(e.target.value) || 10 })}
            min="1"
            max="100"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={config.description}
          onChange={(e) => updateConfig({ description: e.target.value })}
          placeholder="Describe the purpose and usage of this cluster..."
          rows={3}
        />
      </div>
    </div>
  )

  // Step 2: Architecture-specific Configuration
  const renderArchConfigStep = () => {
    if (config.architecture === 'optimized') {
      return (
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Optimized Cluster Configuration
            </h2>
            <p className="text-gray-600">
              Choose your optimized tier and processing limits
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {OPTIMIZED_TIERS.map((tier) => (
              <Card 
                key={tier.id}
                className={`cursor-pointer transition-all ${
                  config.optimized_config?.tier === tier.id 
                    ? 'ring-2 ring-green-500 shadow-lg' 
                    : 'hover:shadow-md'
                } ${tier.popular ? 'border-green-500' : ''}`}
                onClick={() => updateConfig({
                  optimized_config: {
                    tier: tier.id as any,
                    monthly_curves_limit: tier.curves,
                    storage_limit: tier.storage
                  },
                  pricing_model: 'optimized'
                })}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  {config.classification === 'gratis' ? (
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-gray-400 line-through">
                        ${tier.price}/month
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        FREE
                      </div>
                    </div>
                  ) : config.classification === 'trial' ? (
                    <div className="space-y-1">
                      <div className="text-sm text-blue-600 font-medium">
                        30-day trial, then
                      </div>
                      <div className="text-3xl font-bold text-green-600">
                        ${tier.price}/month
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-green-600">
                      ${tier.price}/month
                    </div>
                  )}
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Monthly Curves</span>
                      <span className="font-medium">{tier.curves.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Storage</span>
                      <span className="font-medium">{tier.storage}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    {tier.features.slice(0, 3).map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-xs text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )
    }

    // Traditional cluster configuration
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Traditional Cluster Configuration
          </h2>
          <p className="text-gray-600">
            Configure your dedicated infrastructure resources
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <Label>Node Count *</Label>
            <Select
              value={config.traditional_config?.nodes?.toString()}
              onValueChange={(value) => updateConfig({
                traditional_config: {
                  ...config.traditional_config,
                  nodes: parseInt(value),
                  cpu_per_node: config.traditional_config?.cpu_per_node,
                  memory_per_node: config.traditional_config?.memory_per_node,
                  storage_per_node: config.traditional_config?.storage_per_node || '500GB',
                  hot_tier_size: config.traditional_config?.hot_tier_size || '100GB',
                  warm_tier_size: config.traditional_config?.warm_tier_size || '500GB',
                  cold_tier_size: config.traditional_config?.cold_tier_size || '2TB',
                  retention_policy: config.traditional_config?.retention_policy || {
                    hot_days: 90,
                    warm_days: 365,
                    cold_days: 2555,
                    archive_enabled: true
                  }
                }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select node count..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Node</SelectItem>
                <SelectItem value="3">3 Nodes</SelectItem>
                <SelectItem value="5">5 Nodes</SelectItem>
                <SelectItem value="7">7 Nodes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>CPU per Node *</Label>
            <Select
              value={config.traditional_config?.cpu_per_node?.toString()}
              onValueChange={(value) => updateConfig({
                traditional_config: {
                  ...config.traditional_config!,
                  cpu_per_node: parseInt(value)
                }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select CPU count..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 CPUs</SelectItem>
                <SelectItem value="8">8 CPUs</SelectItem>
                <SelectItem value="16">16 CPUs</SelectItem>
                <SelectItem value="32">32 CPUs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Memory per Node *</Label>
            <Select
              value={config.traditional_config?.memory_per_node}
              onValueChange={(value) => updateConfig({
                traditional_config: {
                  ...config.traditional_config!,
                  memory_per_node: value
                }
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select memory size..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="16GB">16 GB</SelectItem>
                <SelectItem value="32GB">32 GB</SelectItem>
                <SelectItem value="64GB">64 GB</SelectItem>
                <SelectItem value="128GB">128 GB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-blue-50 p-6 rounded-lg">
          <h4 className="font-bold text-blue-800 mb-3">Estimated Configuration</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Nodes:</span>
              <div className="font-medium">{config.traditional_config?.nodes || 3}</div>
            </div>
            <div>
              <span className="text-gray-600">Total CPUs:</span>
              <div className="font-medium">{(config.traditional_config?.nodes || 3) * (config.traditional_config?.cpu_per_node || 8)}</div>
            </div>
            <div>
              <span className="text-gray-600">Total Memory:</span>
              <div className="font-medium">
                {(config.traditional_config?.nodes || 3) * parseInt((config.traditional_config?.memory_per_node || '32GB').replace('GB', ''))} GB
              </div>
            </div>
            <div>
              <span className="text-gray-600">Monthly Cost:</span>
              <div className="font-medium text-blue-600">${config.estimated_monthly_cost.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 3: Billing Assignment
  const renderBillingStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Billing Assignment
        </h2>
        <p className="text-gray-600">
          Assign a responsible user who will be charged for this cluster
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-medium">
            {config.classification === 'gratis' ? 'Billing Classification' : 'Responsible User'}
          </h3>
        </div>

        {config.classification === 'gratis' ? (
          <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
            <div className="flex items-start space-x-3">
              <Check className="w-6 h-6 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800 text-lg">Gratis Cluster - Free Forever</h4>
                <p className="text-sm text-green-700 mt-2">
                  This cluster is completely free and does not require any billing information or responsible user.
                  Perfect for testing, development, or small-scale projects.
                </p>
                <div className="mt-3 text-sm text-green-600">
                  ✓ No credit card required<br />
                  ✓ No monthly charges<br />
                  ✓ Full access to cluster features
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Who will pay for this cluster? *</Label>
              <Select
                value={config.responsible_user_id}
                onValueChange={(value) => updateConfig({ responsible_user_id: value })}
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

            {config.classification === 'trial' && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">30-Day Trial Period</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      This cluster starts with a 30-day free trial. After the trial expires,
                      the selected user will be charged ${config.estimated_monthly_cost.toLocaleString()}/month.
                      The cluster will automatically upgrade to Enterprise tier after the trial period.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {config.classification === 'enterprise' && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Billing Responsibility</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      The selected user will be charged ${config.estimated_monthly_cost.toLocaleString()}/month for this cluster.
                      They will receive monthly billing statements and usage reports.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )

  // Step 4: User Assignment
  const renderUserAssignmentStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          User Assignment
        </h2>
        <p className="text-gray-600">
          Assign users who can access this cluster (optional)
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          <UserPlus className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-medium">Cluster Access</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Select Users (Optional)</Label>
            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
              {availableUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={config.assigned_users.includes(user.email)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateConfig({
                          assigned_users: [...config.assigned_users, user.email]
                        })
                      } else {
                        updateConfig({
                          assigned_users: config.assigned_users.filter(email => email !== user.email)
                        })
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor={`user-${user.id}`} className="text-sm">
                    {user.full_name || user.email} ({user.email})
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start space-x-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-800">Access Control</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Selected users will have standard access to this cluster. 
                  You can modify permissions and add more users after creation.
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {config.assigned_users.length} of {config.max_assigned_users} users selected.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )

  // Step 5: Review and Create
  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Review & Create
        </h2>
        <p className="text-gray-600">
          Review your cluster configuration before creation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Configuration */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Basic Configuration
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-medium">{config.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Architecture:</span>
              <Badge variant={config.architecture === 'optimized' ? 'default' : 'secondary'}>
                {config.architecture}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{config.cluster_type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Region:</span>
              <span className="font-medium">{config.region}</span>
            </div>
          </div>
        </Card>

        {/* Architecture Configuration */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            {config.architecture === 'optimized' ? (
              <Brain className="w-5 h-5 mr-2 text-green-600" />
            ) : (
              <Server className="w-5 h-5 mr-2 text-blue-600" />
            )}
            {config.architecture === 'optimized' ? 'Optimized' : 'Traditional'} Configuration
          </h3>
          
          {config.architecture === 'optimized' && config.optimized_config ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Tier:</span>
                <span className="font-medium capitalize">{config.optimized_config.tier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Curves:</span>
                <span className="font-medium">{config.optimized_config.monthly_curves_limit.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Storage:</span>
                <span className="font-medium">{config.optimized_config.storage_limit}</span>
              </div>
            </div>
          ) : config.traditional_config ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Nodes:</span>
                <span className="font-medium">{config.traditional_config.nodes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">CPU/Node:</span>
                <span className="font-medium">{config.traditional_config.cpu_per_node}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Memory/Node:</span>
                <span className="font-medium">{config.traditional_config.memory_per_node}</span>
              </div>
            </div>
          ) : null}
        </Card>

        {/* Billing Information */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <CreditCard className="w-5 h-5 mr-2" />
            Billing Information
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Responsible User:</span>
              <span className="font-medium">
                {availableUsers.find(u => u.id === config.responsible_user_id)?.email || 'Not selected'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Monthly Cost:</span>
              <span className="font-bold text-lg text-green-600">
                ${config.estimated_monthly_cost.toLocaleString()}/month
              </span>
            </div>
            {config.architecture === 'optimized' && (
              <div className="text-xs text-green-600">
                85% savings vs traditional clusters
              </div>
            )}
          </div>
        </Card>

        {/* User Assignment */}
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Assignment
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Max Users:</span>
              <span className="font-medium">{config.max_assigned_users}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Initially Assigned:</span>
              <span className="font-medium">{config.assigned_users.length}</span>
            </div>
            {config.assigned_users.length > 0 && (
              <div className="mt-2">
                <div className="text-gray-600 mb-1">Users:</div>
                <div className="space-y-1">
                  {config.assigned_users.slice(0, 3).map((email, idx) => (
                    <div key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {email}
                    </div>
                  ))}
                  {config.assigned_users.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{config.assigned_users.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Creation Warning */}
      <Card className="border-orange-200 bg-orange-50 p-6">
        <div className="flex items-start space-x-3">
          <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-orange-800">Ready to Create</h4>
            <p className="text-sm text-orange-700 mt-1">
              {config.architecture === 'optimized' 
                ? 'Your optimized cluster will be ready in approximately 5 minutes.'
                : 'Your traditional cluster will be ready in approximately 10-15 minutes.'
              }
            </p>
            <p className="text-sm text-orange-700 mt-1">
              Monthly billing will begin immediately upon creation.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )

  const steps = [
    'Architecture',
    'Basic Config',
    'Resources',
    'Billing',
    'Users',
    'Review'
  ]

  const stepComponents = [
    renderArchitectureStep,
    renderBasicConfigStep,
    renderArchConfigStep,
    renderBillingStep,
    renderUserAssignmentStep,
    renderReviewStep
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Button
            variant="ghost"
            onClick={onCancel}
            className="absolute left-4 top-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clusters
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900">
            Create New Cluster
          </h1>
          <p className="text-gray-600 mt-2">
            Deploy your analytics infrastructure with full user and billing management
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 text-sm font-medium
                  ${index <= currentStep 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-500'
                  }
                `}>
                  {index < currentStep ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-gray-400 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="min-h-[600px] mb-8">
          <CardContent className="p-8">
            {stepComponents[currentStep]()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={currentStep === 0 ? onCancel : handlePrevious}
            disabled={isCreating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? 'Cancel' : 'Previous'}
          </Button>

          <Button
            onClick={currentStep === 5 ? handleCreate : handleNext}
            disabled={!isStepValid() || isCreating}
            className={currentStep === 5 ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Cluster...
              </>
            ) : currentStep === 5 ? (
              <>
                <Cloud className="w-4 h-4 mr-2" />
                Create Cluster
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default UnifiedClusterWizard
