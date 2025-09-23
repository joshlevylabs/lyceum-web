'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ManufacturingChart from './ManufacturingChart'
import {
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface DashboardProps {
  clusterId: string
  projectId?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

interface SensorData {
  id: string
  name: string
  type: 'temperature' | 'pressure' | 'speed' | 'quality' | 'production_count'
  unit: string
  current_value: number
  status: 'normal' | 'warning' | 'critical'
  last_updated: string
}

interface CurveData {
  id: string
  name: string
  data: Array<{ timestamp: number; value: number; quality?: 'good' | 'warning' | 'error' }>
  color: string
  unit?: string
  visible: boolean
}

const MANUFACTURING_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
]

export default function ManufacturingDashboard({ 
  clusterId, 
  projectId,
  autoRefresh = true, 
  refreshInterval = 30000 
}: DashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [timeRange, setTimeRange] = useState('24h')
  const [sensors, setSensors] = useState<SensorData[]>([])
  const [curves, setCurves] = useState<CurveData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(!autoRefresh)

  // Mock data generator for demonstration
  const generateMockData = () => {
    const now = Date.now()
    const hoursBack = timeRange === '1h' ? 1 : timeRange === '6h' ? 6 : timeRange === '24h' ? 24 : 168
    const points = Math.min(hoursBack * 60, 1000) // Limit to 1000 points for performance
    
    const mockSensors: SensorData[] = [
      {
        id: 'temp_1',
        name: 'Line 1 Temperature',
        type: 'temperature',
        unit: '°C',
        current_value: 85.2 + Math.random() * 10,
        status: Math.random() > 0.8 ? 'warning' : 'normal',
        last_updated: new Date().toISOString()
      },
      {
        id: 'pressure_1',
        name: 'Hydraulic Pressure',
        type: 'pressure',
        unit: 'PSI',
        current_value: 120 + Math.random() * 20,
        status: Math.random() > 0.9 ? 'critical' : 'normal',
        last_updated: new Date().toISOString()
      },
      {
        id: 'speed_1',
        name: 'Line Speed',
        type: 'speed',
        unit: 'RPM',
        current_value: 1800 + Math.random() * 200,
        status: 'normal',
        last_updated: new Date().toISOString()
      },
      {
        id: 'quality_1',
        name: 'Quality Score',
        type: 'quality',
        unit: '%',
        current_value: 94 + Math.random() * 5,
        status: Math.random() > 0.7 ? 'warning' : 'normal',
        last_updated: new Date().toISOString()
      },
      {
        id: 'production_1',
        name: 'Production Count',
        type: 'production_count',
        unit: 'units/hr',
        current_value: 450 + Math.random() * 50,
        status: 'normal',
        last_updated: new Date().toISOString()
      }
    ]

    const mockCurves: CurveData[] = mockSensors.map((sensor, index) => ({
      id: sensor.id,
      name: sensor.name,
      unit: sensor.unit,
      color: MANUFACTURING_COLORS[index % MANUFACTURING_COLORS.length],
      visible: true,
      data: Array.from({ length: points }, (_, i) => {
        const timestamp = now - (hoursBack * 60 - i) * 60 * 1000
        let baseValue = sensor.current_value
        
        // Add some realistic variation based on sensor type
        let variation = 0
        switch (sensor.type) {
          case 'temperature':
            variation = Math.sin(i / 20) * 5 + Math.random() * 2
            break
          case 'pressure':
            variation = Math.sin(i / 30) * 8 + Math.random() * 3
            break
          case 'speed':
            variation = Math.sin(i / 15) * 50 + Math.random() * 10
            break
          case 'quality':
            variation = Math.sin(i / 40) * 3 + Math.random() * 1
            break
          case 'production_count':
            variation = Math.sin(i / 25) * 20 + Math.random() * 5
            break
        }
        
        const value = baseValue + variation
        
        // Determine quality based on thresholds
        let quality: 'good' | 'warning' | 'error' = 'good'
        if (sensor.type === 'temperature' && (value > 95 || value < 75)) {
          quality = value > 100 ? 'error' : 'warning'
        } else if (sensor.type === 'pressure' && (value > 150 || value < 100)) {
          quality = value > 160 ? 'error' : 'warning'
        } else if (sensor.type === 'quality' && value < 90) {
          quality = value < 85 ? 'error' : 'warning'
        }
        
        return { timestamp, value, quality }
      })
    }))

    setSensors(mockSensors)
    setCurves(mockCurves)
  }

  const refreshData = async () => {
    setIsRefreshing(true)
    setError(null)
    
    try {
      // In a real implementation, this would fetch from the cluster API
      // await fetch(`/api/clusters/${clusterId}/data?timeRange=${timeRange}`)
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      generateMockData()
      setLastRefresh(new Date())
      
    } catch (err) {
      setError('Failed to refresh data')
      console.error('Dashboard refresh error:', err)
    } finally {
      setIsRefreshing(false)
      setLoading(false)
    }
  }

  // Initial data load
  useEffect(() => {
    refreshData()
  }, [clusterId, timeRange])

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh || isPaused) return

    const interval = setInterval(refreshData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, isPaused, refreshInterval, clusterId, timeRange])

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
  }

  const toggleCurveVisibility = (curveId: string) => {
    setCurves(prev => prev.map(curve => 
      curve.id === curveId ? { ...curve, visible: !curve.visible } : curve
    ))
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      default: return <CheckCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const criticalCount = sensors.filter(s => s.status === 'critical').length
  const warningCount = sensors.filter(s => s.status === 'warning').length
  const visibleCurves = curves.filter(c => c.visible)

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manufacturing Dashboard</h2>
          <p className="text-gray-600">
            Real-time monitoring • Cluster: {clusterId}
            {projectId && ` • Project: ${projectId}`}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <PlayIcon className="h-4 w-4" /> : <PauseIcon className="h-4 w-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-semibold text-gray-900">
                  {sensors.length - criticalCount - warningCount}
                </p>
                <p className="text-sm text-gray-600">Normal Sensors</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-semibold text-gray-900">{warningCount}</p>
                <p className="text-sm text-gray-600">Warnings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-semibold text-gray-900">{criticalCount}</p>
                <p className="text-sm text-gray-600">Critical Issues</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-8 w-8 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-semibold text-gray-900">{visibleCurves.length}</p>
                <p className="text-sm text-gray-600">Active Curves</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-800">{error}</span>
              <Button variant="outline" size="sm" onClick={refreshData} className="ml-auto">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Values */}
      <Card>
        <CardHeader>
          <CardTitle>Current Sensor Values</CardTitle>
          <CardDescription>Real-time measurements from production line</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sensors.map(sensor => (
              <div key={sensor.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center">
                  {getStatusIcon(sensor.status)}
                  <div className="ml-3">
                    <p className="font-medium">{sensor.name}</p>
                    <p className="text-sm text-gray-600">
                      {sensor.current_value.toFixed(1)} {sensor.unit}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(sensor.status)}>
                  {sensor.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manufacturing Chart */}
      <ManufacturingChart
        curves={curves}
        title="Production Line Analytics"
        height={400}
        timeRange={timeRange as any}
        onTimeRangeChange={handleTimeRangeChange}
        loading={loading}
      />

      {/* Curve Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Curve Visibility</CardTitle>
          <CardDescription>Toggle curves on/off to focus on specific metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {curves.map(curve => (
              <Button
                key={curve.id}
                variant={curve.visible ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCurveVisibility(curve.id)}
                className="flex items-center gap-2"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: curve.color }}
                />
                {curve.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Info */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Data Points</p>
              <p className="text-gray-600">{curves.reduce((sum, c) => sum + c.data.length, 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="font-medium">Render Time</p>
              <p className="text-gray-600">~{Math.round(curves.reduce((sum, c) => sum + c.data.length, 0) / 100)}ms</p>
            </div>
            <div>
              <p className="font-medium">Refresh Rate</p>
              <p className="text-gray-600">{refreshInterval / 1000}s</p>
            </div>
            <div>
              <p className="font-medium">Optimization</p>
              <p className="text-gray-600">{visibleCurves.length < 50 ? 'Real-time' : 'Batch'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
