'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft, 
  Server, 
  Users, 
  DollarSign,
  Zap,
  HardDrive,
  Cpu,
  MemoryStick,
  Database,
  Clock,
  Shield,
  Rocket
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface ClusterConfiguration {
  // Step 1: Basic Configuration
  name: string
  description: string
  cluster_type: 'development' | 'production' | 'analytics'
  region: string
  
  // Step 2: Performance & Storage
  configuration: {
    nodes: number
    cpu_per_node: number
    memory_per_node: string
    storage_per_node: string
    hot_tier_size: string
    warm_tier_size: string
    cold_tier_size: string
  }
  
  // Step 3: Team Access
  retention_policy: {
    hot_days: number
    warm_days: number
    cold_days: number
    archive_enabled: boolean
  }
  admin_users: string[]
  
  // Step 4: Review
  estimated_cost?: number
}

const CLUSTER_TYPES = [
  {
    value: 'development',
    label: 'Development',
    description: 'Testing and prototyping manufacturing analytics',
    icon: '🧪',
    recommended: false,
    purpose: 'Development & Testing',
    useCases: [
      'Testing new sensor integrations',
      'Developing custom manufacturing dashboards',
      'Prototyping quality control algorithms',
      'Training environments for new operators',
      'Development sandbox for new features'
    ],
    features: {
      performance: 'Standard',
      reliability: 'Standard',
      scalability: 'Limited',
      costOptimized: true,
      support: 'Community',
      uptime: '99.0%',
      curves: '<1,000',
      nodes: '1-2',
      storage: 'Basic tiers',
      backups: 'Daily'
    },
    monthlyPrice: '$50-150',
    idealFor: 'Teams starting with manufacturing analytics or testing new workflows'
  },
  {
    value: 'analytics',
    label: 'Manufacturing Analytics',
    description: 'Production-ready manufacturing data analysis',
    icon: '📊',
    recommended: true,
    purpose: 'Real-time Manufacturing Intelligence',
    useCases: [
      'Real-time production line monitoring',
      'Quality control dashboards',
      'Manufacturing KPI tracking',
      'Predictive maintenance analytics',
      'Production optimization analysis',
      'Cross-shift performance comparison'
    ],
    features: {
      performance: 'High',
      reliability: 'High',
      scalability: 'High',
      costOptimized: false,
      support: 'Business',
      uptime: '99.9%',
      curves: '10,000+',
      nodes: '3-5',
      storage: 'Hot/Warm/Cold tiers',
      backups: 'Hourly'
    },
    monthlyPrice: '$200-500',
    idealFor: 'Manufacturing teams needing real-time insights and 10K+ curve performance'
  },
  {
    value: 'production',
    label: 'Production',
    description: 'Mission-critical enterprise manufacturing operations',
    icon: '🏭',
    recommended: false,
    purpose: 'Enterprise Manufacturing Platform',
    useCases: [
      'Enterprise-wide manufacturing data platform',
      'Multi-facility analytics and reporting',
      'Regulatory compliance and audit trails',
      'Advanced ML/AI manufacturing insights',
      '24/7 monitoring with guaranteed uptime',
      'Complex supply chain analytics'
    ],
    features: {
      performance: 'Maximum',
      reliability: 'Maximum',
      scalability: 'Unlimited',
      costOptimized: false,
      support: 'Enterprise',
      uptime: '99.99%',
      curves: '100,000+',
      nodes: '5-10+',
      storage: 'All tiers + Archive',
      backups: 'Real-time'
    },
    monthlyPrice: '$500-2000+',
    idealFor: 'Large enterprises with mission-critical manufacturing operations'
  }
]

const REGIONS = [
  { value: 'us-east-1', label: 'US East (Virginia)', latency: '12ms' },
  { value: 'us-west-2', label: 'US West (Oregon)', latency: '45ms' },
  { value: 'eu-west-1', label: 'Europe (Ireland)', latency: '87ms' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)', latency: '124ms' }
]

const MEMORY_OPTIONS = ['16GB', '32GB', '64GB', '128GB', '256GB']
const STORAGE_OPTIONS = ['250GB', '500GB', '1TB', '2TB', '4TB']
const TIER_SIZE_OPTIONS = ['100GB', '500GB', '1TB', '2TB', '5TB', '10TB']

export default function ClusterCreationWizard({ onComplete, onCancel }: { 
  onComplete: (cluster: any) => void
  onCancel: () => void 
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState<ClusterConfiguration>({
    name: '',
    description: '',
    cluster_type: 'analytics',
    region: 'us-east-1',
    configuration: {
      nodes: 3,
      cpu_per_node: 8,
      memory_per_node: '32GB',
      storage_per_node: '500GB',
      hot_tier_size: '200GB',
      warm_tier_size: '1TB',
      cold_tier_size: '5TB'
    },
    retention_policy: {
      hot_days: 30,
      warm_days: 180,
      cold_days: 1095,
      archive_enabled: true
    },
    admin_users: []
  })

  const { user } = useAuth()
  const router = useRouter()

  const calculateEstimatedCost = () => {
    const { nodes, cpu_per_node, memory_per_node, storage_per_node } = formData.configuration
    
    // Simplified cost calculation (in reality this would be more complex)
    const cpuCost = nodes * cpu_per_node * 0.05 * 24 * 30 // $0.05 per vCPU hour
    const memoryCost = nodes * parseInt(memory_per_node) * 0.01 * 24 * 30 // $0.01 per GB hour
    const storageCost = nodes * parseInt(storage_per_node) * 0.1 // $0.1 per GB month
    
    const baseClusterCost = formData.cluster_type === 'production' ? 200 : 
                           formData.cluster_type === 'analytics' ? 100 : 50
    
    return Math.round((cpuCost + memoryCost + storageCost + baseClusterCost) * 100) / 100
  }

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      estimated_cost: calculateEstimatedCost()
    }))
  }, [formData.configuration, formData.cluster_type])

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) return
    
    setIsCreating(true)
    
    try {
      // Get the access token from localStorage (same way as our API tests)
      const authData = JSON.parse(localStorage.getItem('sb-kffiaqsihldgqdwagook-auth-token') || '{}')
      const accessToken = authData.access_token
      
      if (!accessToken) {
        throw new Error('No access token found. Please refresh the page and try again.')
      }
      
      const response = await fetch('/api/clusters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(formData)
      })
      
      const result = await response.json()
      
      if (result.success) {
        onComplete(result.cluster)
      } else {
        throw new Error(result.error || 'Failed to create cluster')
      }
    } catch (error) {
      console.error('Error creating cluster:', error)
      // In a real app, show error notification
      alert('Failed to create cluster. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() && formData.cluster_type && formData.region
      case 2:
        return formData.configuration.nodes > 0 && formData.configuration.cpu_per_node > 0
      case 3:
        return formData.retention_policy.hot_days > 0
      case 4:
        return true
      default:
        return false
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Server className="h-12 w-12 mx-auto mb-4 text-blue-600" />
        <h2 className="text-2xl font-bold">Basic Configuration</h2>
        <p className="text-gray-600">Set up the fundamental settings for your cluster</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Cluster Name</Label>
          <Input
            id="name"
            placeholder="e.g., Production Line Analytics"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          />
        </div>

        <div>
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Describe the purpose of this cluster..."
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div>
          <Label>Cluster Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2 mb-6">
            {CLUSTER_TYPES.map((type) => (
              <Card 
                key={type.value}
                className={`cursor-pointer transition-all ${
                  formData.cluster_type === type.value 
                    ? 'ring-2 ring-blue-500 bg-blue-50' 
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, cluster_type: type.value as any }))}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-2xl mb-2">{type.icon}</div>
                  <div className="font-semibold">{type.label}</div>
                  <div className="text-sm text-gray-600 mb-2">{type.description}</div>
                  <div className="text-xs text-blue-600 font-medium mb-2">{type.monthlyPrice}</div>
                  {type.recommended && (
                    <Badge className="mt-2" variant="default">Recommended</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Information Panel */}
          {formData.cluster_type && (
            <Card className="mb-4">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CLUSTER_TYPES.find(t => t.value === formData.cluster_type)?.icon}</span>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {CLUSTER_TYPES.find(t => t.value === formData.cluster_type)?.label}
                      {CLUSTER_TYPES.find(t => t.value === formData.cluster_type)?.recommended && (
                        <Badge variant="default">Recommended</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {CLUSTER_TYPES.find(t => t.value === formData.cluster_type)?.purpose}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Use Cases */}
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Primary Use Cases
                  </h4>
                  <ul className="space-y-1">
                    {CLUSTER_TYPES.find(t => t.value === formData.cluster_type)?.useCases.map((useCase, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        {useCase}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Ideal For */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold text-blue-800">Ideal for:</span> {CLUSTER_TYPES.find(t => t.value === formData.cluster_type)?.idealFor}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feature Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Feature Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Feature</th>
                      <th className="text-center py-2 font-semibold">🧪 Development</th>
                      <th className="text-center py-2 font-semibold">📊 Analytics ⭐</th>
                      <th className="text-center py-2 font-semibold">🏭 Production</th>
                    </tr>
                  </thead>
                  <tbody className="space-y-1">
                    <tr className="border-b">
                      <td className="py-2 font-medium">Performance</td>
                      <td className="text-center py-2">Standard</td>
                      <td className="text-center py-2 bg-blue-50">High</td>
                      <td className="text-center py-2">Maximum</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Curve Capacity</td>
                      <td className="text-center py-2">&lt;1,000</td>
                      <td className="text-center py-2 bg-blue-50">10,000+</td>
                      <td className="text-center py-2">100,000+</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Uptime SLA</td>
                      <td className="text-center py-2">99.0%</td>
                      <td className="text-center py-2 bg-blue-50">99.9%</td>
                      <td className="text-center py-2">99.99%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Node Range</td>
                      <td className="text-center py-2">1-2</td>
                      <td className="text-center py-2 bg-blue-50">3-5</td>
                      <td className="text-center py-2">5-10+</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Storage Tiers</td>
                      <td className="text-center py-2">Basic</td>
                      <td className="text-center py-2 bg-blue-50">Hot/Warm/Cold</td>
                      <td className="text-center py-2">All + Archive</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Backup Frequency</td>
                      <td className="text-center py-2">Daily</td>
                      <td className="text-center py-2 bg-blue-50">Hourly</td>
                      <td className="text-center py-2">Real-time</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 font-medium">Support Level</td>
                      <td className="text-center py-2">Community</td>
                      <td className="text-center py-2 bg-blue-50">Business</td>
                      <td className="text-center py-2">Enterprise</td>
                    </tr>
                    <tr>
                      <td className="py-2 font-medium">Monthly Cost</td>
                      <td className="text-center py-2 text-green-600 font-semibold">$50-150</td>
                      <td className="text-center py-2 bg-blue-50 text-blue-600 font-semibold">$200-500</td>
                      <td className="text-center py-2 text-orange-600 font-semibold">$500-2000+</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <span className="font-semibold">💡 Tip:</span> Most manufacturing teams start with <span className="font-semibold">Analytics</span> for the optimal balance of performance, features, and cost. Upgrade to Production for mission-critical operations.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Label>Region</Label>
          <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={REGIONS.find(r => r.value === formData.region)?.label || 'Select a region'} />
            </SelectTrigger>
            <SelectContent>
              {REGIONS.map((region) => (
                <SelectItem key={region.value} value={region.value}>
                  <div className="flex justify-between w-full">
                    <span>{region.label}</span>
                    <span className="text-sm text-gray-500 ml-4">{region.latency}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Zap className="h-12 w-12 mx-auto mb-4 text-green-600" />
        <h2 className="text-2xl font-bold">Performance & Storage</h2>
        <p className="text-gray-600">Configure computing resources and data storage tiers</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Compute Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Number of Nodes</Label>
              <Select 
                value={formData.configuration.nodes.toString()} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, 
                  configuration: { ...prev.configuration, nodes: parseInt(value) }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num} nodes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>CPU per Node</Label>
              <Select 
                value={formData.configuration.cpu_per_node.toString()} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, 
                  configuration: { ...prev.configuration, cpu_per_node: parseInt(value) }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2, 4, 8, 16, 32].map((num) => (
                    <SelectItem key={num} value={num.toString()}>{num} vCPUs</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Memory per Node</Label>
              <Select 
                value={formData.configuration.memory_per_node} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, 
                  configuration: { ...prev.configuration, memory_per_node: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_OPTIONS.map((memory) => (
                    <SelectItem key={memory} value={memory}>{memory}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Storage per Node</Label>
              <Select 
                value={formData.configuration.storage_per_node} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, 
                  configuration: { ...prev.configuration, storage_per_node: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_OPTIONS.map((storage) => (
                    <SelectItem key={storage} value={storage}>{storage}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Data Lifecycle Tiers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Hot Tier (Fast Access)</Label>
              <Select 
                value={formData.configuration.hot_tier_size} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, 
                  configuration: { ...prev.configuration, hot_tier_size: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Warm Tier (Balanced)</Label>
              <Select 
                value={formData.configuration.warm_tier_size} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, 
                  configuration: { ...prev.configuration, warm_tier_size: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Cold Tier (Archive)</Label>
              <Select 
                value={formData.configuration.cold_tier_size} 
                onValueChange={(value) => setFormData(prev => ({
                  ...prev, 
                  configuration: { ...prev.configuration, cold_tier_size: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIER_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={size}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-purple-600" />
        <h2 className="text-2xl font-bold">Team Access & Retention</h2>
        <p className="text-gray-600">Configure data retention policies and team access</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Data Retention Policy
          </CardTitle>
          <CardDescription>
            Configure how long data stays in each storage tier before being moved to the next tier
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Hot Tier (Days)</Label>
              <Input
                type="number"
                value={formData.retention_policy.hot_days}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  retention_policy: { ...prev.retention_policy, hot_days: parseInt(e.target.value) || 0 }
                }))}
              />
              <p className="text-sm text-gray-500 mt-1">Fast access, highest cost</p>
            </div>

            <div>
              <Label>Warm Tier (Days)</Label>
              <Input
                type="number"
                value={formData.retention_policy.warm_days}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  retention_policy: { ...prev.retention_policy, warm_days: parseInt(e.target.value) || 0 }
                }))}
              />
              <p className="text-sm text-gray-500 mt-1">Balanced access and cost</p>
            </div>

            <div>
              <Label>Cold Tier (Days)</Label>
              <Input
                type="number"
                value={formData.retention_policy.cold_days}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  retention_policy: { ...prev.retention_policy, cold_days: parseInt(e.target.value) || 0 }
                }))}
              />
              <p className="text-sm text-gray-500 mt-1">Slower access, lowest cost</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="archive"
              checked={formData.retention_policy.archive_enabled}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                retention_policy: { ...prev.retention_policy, archive_enabled: !!checked }
              }))}
            />
            <Label htmlFor="archive">Enable long-term archive storage</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Team Access
          </CardTitle>
          <CardDescription>
            You will be automatically added as the cluster administrator
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-semibold">{user?.email || 'You'}</div>
                <div className="text-sm text-gray-600">Administrator (Owner)</div>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Additional team members can be added after cluster creation through the cluster settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Rocket className="h-12 w-12 mx-auto mb-4 text-orange-600" />
        <h2 className="text-2xl font-bold">Review & Deploy</h2>
        <p className="text-gray-600">Review your configuration and deploy the cluster</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Name:</span>
              <span className="font-semibold">{formData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Type:</span>
              <Badge variant="outline">{formData.cluster_type}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Region:</span>
              <span>{REGIONS.find(r => r.value === formData.region)?.label}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-gray-600">Nodes:</span>
              <span>{formData.configuration.nodes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">CPU per Node:</span>
              <span>{formData.configuration.cpu_per_node} vCPUs</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Memory per Node:</span>
              <span>{formData.configuration.memory_per_node}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Storage per Node:</span>
              <span>{formData.configuration.storage_per_node}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Estimate
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                ${formData.estimated_cost}/month
              </div>
              <p className="text-sm text-gray-600">Estimated monthly cost</p>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Compute ({formData.configuration.nodes} × {formData.configuration.cpu_per_node} vCPU)</span>
                <span>${Math.round(formData.configuration.nodes * formData.configuration.cpu_per_node * 0.05 * 24 * 30)}</span>
              </div>
              <div className="flex justify-between">
                <span>Memory ({formData.configuration.nodes} × {formData.configuration.memory_per_node})</span>
                <span>${Math.round(formData.configuration.nodes * parseInt(formData.configuration.memory_per_node) * 0.01 * 24 * 30)}</span>
              </div>
              <div className="flex justify-between">
                <span>Storage ({formData.configuration.nodes} × {formData.configuration.storage_per_node})</span>
                <span>${Math.round(formData.configuration.nodes * parseInt(formData.configuration.storage_per_node) * 0.1)}</span>
              </div>
              <div className="flex justify-between">
                <span>Base Cluster</span>
                <span>${formData.cluster_type === 'production' ? 200 : formData.cluster_type === 'analytics' ? 100 : 50}</span>
              </div>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                💡 Costs are estimated and may vary based on actual usage and data transfer.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Lifecycle Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Hot Tier:</span>
              <span>{formData.retention_policy.hot_days} days → {formData.configuration.hot_tier_size}</span>
            </div>
            <div className="flex justify-between">
              <span>Warm Tier:</span>
              <span>{formData.retention_policy.warm_days} days → {formData.configuration.warm_tier_size}</span>
            </div>
            <div className="flex justify-between">
              <span>Cold Tier:</span>
              <span>{formData.retention_policy.cold_days} days → {formData.configuration.cold_tier_size}</span>
            </div>
            <div className="flex justify-between">
              <span>Archive:</span>
              <span>{formData.retention_policy.archive_enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Create New Cluster</h1>
          <span className="text-sm text-gray-600">Step {currentStep} of 4</span>
        </div>
        <Progress value={(currentStep / 4) * 100} className="h-2" />
      </div>

      {/* Step Content */}
      <Card className="min-h-[600px]">
        <CardContent className="p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={currentStep === 1 ? onCancel : handlePrevious}
          disabled={isCreating}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </Button>

        <Button
          onClick={currentStep === 4 ? handleSubmit : handleNext}
          disabled={!isStepValid() || isCreating}
          className={currentStep === 4 ? 'bg-green-600 hover:bg-green-700' : ''}
        >
          {isCreating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : currentStep === 4 ? (
            <>
              <Rocket className="h-4 w-4 mr-2" />
              Deploy Cluster
            </>
          ) : (
            <>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
