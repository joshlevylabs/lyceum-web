'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Check, Zap, Brain, DollarSign, Clock, ArrowLeft, Loader2 } from 'lucide-react'
import { OPTIMIZED_TIERS, OptimizedClusterService, OptimizedClusterTier } from '@/services/optimizedClusterService'

interface OptimizedClusterWizardProps {
  onComplete: (cluster: any) => void
  onCancel: () => void
}

export const OptimizedClusterWizard: React.FC<OptimizedClusterWizardProps> = ({
  onComplete,
  onCancel
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('professional')
  const [clusterName, setClusterName] = useState('')
  const [clusterDescription, setClusterDescription] = useState('')
  const [isDeploying, setIsDeploying] = useState(false)

  const selectedTierConfig = OPTIMIZED_TIERS.find(t => t.id === selectedTier)

  const handleDeploy = async () => {
    if (!clusterName.trim()) {
      alert('Please enter a cluster name')
      return
    }

    setIsDeploying(true)
    
    try {
      // Generate a unique customer ID for this cluster
      const customerId = `customer-${Date.now()}`
      
      const cluster = await OptimizedClusterService.createOptimizedCluster({
        name: clusterName,
        description: clusterDescription,
        tier: selectedTier,
        customerId: customerId
      })
      
      // Add the customer ID to the cluster for future reference
      cluster.customer_id = customerId
      
      onComplete(cluster)
    } catch (error) {
      console.error('Failed to create optimized cluster:', error)
      alert('Failed to create cluster. Please try again.')
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clusters
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900">
            Launch Your Optimized Analytics Cluster
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mt-4">
            Process thousands of curves with lightning speed while saving up to 85% 
            compared to traditional cloud infrastructure. Fully managed, automatically optimized.
          </p>
          
          {/* Key Benefits */}
          <div className="flex justify-center space-x-8 mt-8">
            <div className="flex items-center space-x-2 text-green-600">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Serverless processing</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <Brain className="w-5 h-5" />
              <span className="font-medium">AI-optimized storage</span>
            </div>
            <div className="flex items-center space-x-2 text-purple-600">
              <DollarSign className="w-5 h-5" />
              <span className="font-medium">85% cost savings</span>
            </div>
            <div className="flex items-center space-x-2 text-orange-600">
              <Clock className="w-5 h-5" />
              <span className="font-medium">5-minute setup</span>
            </div>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {OPTIMIZED_TIERS.map((tier) => (
            <Card 
              key={tier.id}
              className={`relative cursor-pointer transition-all duration-200 ${
                selectedTier === tier.id 
                  ? 'ring-2 ring-blue-500 shadow-lg' 
                  : 'hover:shadow-md'
              } ${tier.popular ? 'border-blue-500' : ''}`}
              onClick={() => setSelectedTier(tier.id)}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}
              {tier.badge && !tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white px-3 py-1">
                    {tier.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <div className="space-y-2">
                  <div className="text-4xl font-bold text-blue-600">
                    ${tier.price}
                    <span className="text-lg font-normal text-gray-500">/month</span>
                  </div>
                  <div className="text-sm text-green-600 font-medium">
                    Save {OptimizedClusterService.calculateSavings(tier.price)}% vs traditional
                  </div>
                </div>
                <CardDescription className="text-center">
                  {tier.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Key Metrics */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monthly Curves</span>
                    <span className="font-bold">{tier.curves.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage</span>
                    <span className="font-bold">{tier.storage}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Processing</span>
                    <span className="font-bold">Serverless</span>
                  </div>
                </div>
                
                {/* Features */}
                <div className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Cluster Configuration */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cluster Configuration</CardTitle>
            <CardDescription>
              Your optimized cluster will be automatically configured for maximum performance and cost efficiency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clusterName">Cluster Name *</Label>
                <Input 
                  id="clusterName"
                  type="text"
                  placeholder="e.g., analytics-production"
                  value={clusterName}
                  onChange={(e) => setClusterName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clusterDescription">Description</Label>
                <Input 
                  id="clusterDescription"
                  type="text"
                  placeholder="e.g., Production analytics cluster for manufacturing data"
                  value={clusterDescription}
                  onChange={(e) => setClusterDescription(e.target.value)}
                />
              </div>
            </div>

            {/* Selected Configuration Preview */}
            {selectedTierConfig && (
              <div className="bg-blue-50 p-6 rounded-lg space-y-4">
                <h4 className="font-bold text-blue-800">Your Optimized Configuration</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Processing Model:</span>
                    <div className="font-medium">Serverless (pay per use)</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Storage Tier:</span>
                    <div className="font-medium">Intelligent lifecycle</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Monthly Curves:</span>
                    <div className="font-medium">{selectedTierConfig.curves.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Storage Limit:</span>
                    <div className="font-medium">{selectedTierConfig.storage}</div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 mb-2">Expected Performance:</div>
                  <div className="space-y-1 text-sm">
                    <div>📊 <strong>Processing:</strong> Sub-second response for cached curves</div>
                    <div>⚡ <strong>Scaling:</strong> Auto-scales from 0 to handle any load</div>
                    <div>💰 <strong>Monthly Cost:</strong> ${selectedTierConfig.price}/month (predictable)</div>
                    <div>🎯 <strong>Savings:</strong> {OptimizedClusterService.calculateSavings(selectedTierConfig.price)}% vs traditional clusters</div>
                  </div>
                </div>
              </div>
            )}

            <Button 
              size="lg" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!clusterName.trim() || isDeploying}
              onClick={handleDeploy}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deploying Optimized Cluster...
                </>
              ) : (
                <>
                  Deploy Optimized Cluster (5 minutes)
                </>
              )}
            </Button>
            
            <div className="text-xs text-gray-500 text-center">
              * Cluster will be ready in approximately 5 minutes. You'll be redirected to the cluster dashboard upon completion.
            </div>
          </CardContent>
        </Card>

        {/* Cost Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Cost Comparison</CardTitle>
            <CardDescription>
              See how much you save with Lyceum's optimized infrastructure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Lyceum Optimized */}
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-green-800">Lyceum Optimized</h3>
                  <Badge className="bg-green-600 text-white">Recommended</Badge>
                </div>
                
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ${selectedTierConfig?.price}/month
                </div>
                
                <div className="space-y-2 text-sm text-green-700">
                  <div>✅ Serverless processing (pay per use)</div>
                  <div>✅ Intelligent storage tiering (80% savings)</div>
                  <div>✅ Auto-scaling from zero</div>
                  <div>✅ Zero infrastructure management</div>
                  <div>✅ 5-minute setup</div>
                </div>
              </div>

              {/* Traditional Cloud */}
              <div className="bg-red-50 p-6 rounded-lg border border-red-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-red-800">Traditional Cloud</h3>
                  <Badge variant="destructive">Always-On Servers</Badge>
                </div>
                
                <div className="text-3xl font-bold text-red-600 mb-2">
                  $2,000+/month
                </div>
                
                <div className="space-y-2 text-sm text-red-700">
                  <div>❌ Always-on compute clusters</div>
                  <div>❌ Hot storage for all data</div>
                  <div>❌ Manual scaling and optimization</div>
                  <div>❌ Infrastructure management overhead</div>
                  <div>❌ 2-4 weeks setup time</div>
                </div>
              </div>
            </div>

            {/* Savings Highlight */}
            {selectedTierConfig && (
              <div className="bg-blue-50 p-6 rounded-lg border-2 border-blue-300 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-800 mb-2">
                    You Save ${(2000 - selectedTierConfig.price).toLocaleString()}/month
                  </div>
                  <div className="text-lg text-blue-600">
                    That's {OptimizedClusterService.calculateSavings(selectedTierConfig.price)}% cost reduction!
                  </div>
                  <div className="text-sm text-blue-700 mt-2">
                    = ${((2000 - selectedTierConfig.price) * 12).toLocaleString()} per year in savings
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



