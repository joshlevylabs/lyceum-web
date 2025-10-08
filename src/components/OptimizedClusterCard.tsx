'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Zap, 
  TrendingUp, 
  Database, 
  DollarSign, 
  Play, 
  Pause, 
  Settings,
  BarChart3,
  Users,
  Clock
} from 'lucide-react'
import { OptimizedClusterService } from '@/services/optimizedClusterService'

interface OptimizedClusterCardProps {
  cluster: any
  onAction?: (action: string, cluster: any) => void
}

export const OptimizedClusterCard: React.FC<OptimizedClusterCardProps> = ({ 
  cluster, 
  onAction 
}) => {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleProcessCurves = async () => {
    if (!cluster.customer_id) return
    
    setIsProcessing(true)
    try {
      // Process a test batch of 3 curves
      const result = await OptimizedClusterService.processCurves(cluster.customer_id, 3)
      
      if (result.success) {
        alert(`Successfully processed ${result.processed} curves! Storage location: ${result.storageLocation}`)
        onAction?.('refresh', cluster)
      } else {
        alert(`Failed to process curves: ${result.error}`)
      }
    } catch (error) {
      console.error('Error processing curves:', error)
      alert('Failed to process curves. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  const tierConfig = cluster.optimized_config
  const isOptimized = cluster.pricing_model === 'optimized'

  if (!isOptimized) return null

  return (
    <tr key={cluster.id} className="hover:bg-gray-50 bg-green-50/30">
      {/* View */}
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <button
          onClick={() => onAction?.('view', cluster)}
          className="text-green-600 hover:text-green-900 p-2 hover:bg-green-100 rounded-lg transition-colors"
          title="View Optimized Cluster"
        >
          <Zap className="h-5 w-5" />
        </button>
      </td>

      {/* Cluster Name & Description */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
            <Zap className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="flex items-center">
              <div className="text-sm font-medium text-gray-900">{cluster.name}</div>
              <Badge className="ml-2 bg-green-500 text-white text-xs">
                Optimized
              </Badge>
            </div>
            <div className="text-sm text-gray-500">{cluster.description}</div>
          </div>
        </div>
      </td>

      {/* Cluster Key */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-mono font-medium text-green-600">
          {cluster.cluster_key || cluster.id}
        </div>
      </td>

      {/* Type */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          {cluster.tier || 'optimized'}
        </span>
      </td>

      {/* Status */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <Zap className="w-5 h-5 text-green-500" />
          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {cluster.status}
          </span>
        </div>
      </td>

      {/* Health */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-green-600">
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
          <div className="flex items-center text-xs text-green-600">
            <Zap className="h-3 w-3 mr-1" />
            Serverless
          </div>
          <div className="flex items-center text-xs text-gray-600 mt-1">
            <Database className="h-3 w-3 mr-1" />
            {tierConfig?.monthly_curves?.toLocaleString()} curves/mo
          </div>
          <div className="flex items-center text-xs text-gray-600 mt-1">
            <TrendingUp className="h-3 w-3 mr-1" />
            Auto-scaling
          </div>
        </div>
      </td>

      {/* Cost */}
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900">
          <div className="font-medium text-green-600">
            ${cluster.estimated_monthly_cost}/mo
          </div>
          <div className="text-xs text-green-500">
            {OptimizedClusterService.calculateSavings(cluster.estimated_monthly_cost)}% savings
          </div>
        </div>
      </td>

      {/* Pricing Model */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Zap className="w-3 h-3 mr-1" />
          Optimized
        </span>
      </td>

      {/* Role */}
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm font-medium text-green-600">
          admin
        </span>
      </td>

      {/* Created */}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {new Date(cluster.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })}
      </td>

      {/* Actions */}
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          <button 
            onClick={handleProcessCurves}
            disabled={isProcessing}
            className="text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-colors"
            title="Process Test Curves"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button 
            className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded transition-colors" 
            title="Analytics"
            onClick={() => onAction?.('analytics', cluster)}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
          <button 
            className="text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded transition-colors" 
            title="Manage"
            onClick={() => onAction?.('manage', cluster)}
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export default OptimizedClusterCard



