'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import HighPerformanceChart from '@/components/HighPerformanceChart'
import { useChartWorker } from '@/hooks/useChartWorker'
import { dataGenerator, CurveData } from '@/lib/chart-data-generator'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Settings,
  Eye,
  EyeOff,
  Download,
  Share2
} from 'lucide-react'

interface ProductionLine {
  id: string
  name: string
  status: 'running' | 'idle' | 'maintenance' | 'error'
  efficiency: number
  currentBatch?: string
  alertCount: number
}

interface SensorReading {
  id: string
  name: string
  currentValue: number
  unit: string
  status: 'normal' | 'warning' | 'critical'
  trend: 'up' | 'down' | 'stable'
  lastUpdate: Date
  threshold: { min: number; max: number; warning: number }
}

interface AlertInfo {
  id: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  source: string
  acknowledged: boolean
}

interface DashboardProps {
  clusterId?: string
  initialCurves?: CurveData[]
  autoRefreshInterval?: number
  enableRealTimeUpdates?: boolean
  className?: string
}

export default function EnhancedManufacturingDashboard({
  clusterId = 'demo-cluster',
  initialCurves = [],
  autoRefreshInterval = 30000, // 30 seconds
  enableRealTimeUpdates = true,
  className = ''
}: DashboardProps) {
  // Core data state
  const [curves, setCurves] = useState<CurveData[]>(initialCurves)
  const [productionLines, setProductionLines] = useState<ProductionLine[]>([])
  const [sensorReadings, setSensorReadings] = useState<SensorReading[]>([])
  const [alerts, setAlerts] = useState<AlertInfo[]>([])
  
  // Dashboard state
  const [isAutoRefresh, setIsAutoRefresh] = useState(enableRealTimeUpdates)
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h')
  const [selectedLines, setSelectedLines] = useState<string[]>([])
  const [showAlerts, setShowAlerts] = useState(true)
  const [dashboardLayout, setDashboardLayout] = useState<'compact' | 'detailed'>('detailed')
  
  // Performance and status
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('connected')
  
  // Chart worker for performance
  const {
    isReady: workerReady,
    calculateStatistics,
    getOptimizationSuggestions
  } = useChartWorker()

  // Generate initial demo data
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true)
      
      try {
        // Generate production lines
        const lines: ProductionLine[] = [
          { id: 'line1', name: 'Assembly Line A', status: 'running', efficiency: 94.2, currentBatch: 'BATCH-2024-001', alertCount: 0 },
          { id: 'line2', name: 'Assembly Line B', status: 'running', efficiency: 87.5, currentBatch: 'BATCH-2024-002', alertCount: 1 },
          { id: 'line3', name: 'Quality Control', status: 'idle', efficiency: 0, alertCount: 0 },
          { id: 'line4', name: 'Packaging Line', status: 'running', efficiency: 92.8, currentBatch: 'BATCH-2024-003', alertCount: 2 },
          { id: 'line5', name: 'Material Prep', status: 'maintenance', efficiency: 0, alertCount: 0 }
        ]
        setProductionLines(lines)
        setSelectedLines(lines.map(l => l.id))

        // Generate sensor readings  
        const sensors: SensorReading[] = [
          { id: 's1', name: 'Line A Temperature', currentValue: 78.5, unit: '°C', status: 'normal', trend: 'stable', lastUpdate: new Date(), threshold: { min: 60, max: 90, warning: 85 } },
          { id: 's2', name: 'Line B Pressure', currentValue: 156.2, unit: 'PSI', status: 'warning', trend: 'up', lastUpdate: new Date(), threshold: { min: 100, max: 180, warning: 160 } },
          { id: 's3', name: 'QC Flow Rate', currentValue: 42.1, unit: 'L/min', status: 'normal', trend: 'stable', lastUpdate: new Date(), threshold: { min: 30, max: 60, warning: 55 } },
          { id: 's4', name: 'Pack Vibration', currentValue: 12.8, unit: 'Hz', status: 'normal', trend: 'down', lastUpdate: new Date(), threshold: { min: 5, max: 20, warning: 18 } },
          { id: 's5', name: 'Material Power', currentValue: 847.3, unit: 'kW', status: 'critical', trend: 'up', lastUpdate: new Date(), threshold: { min: 400, max: 900, warning: 800 } }
        ]
        setSensorReadings(sensors)

        // Generate alerts
        const currentAlerts: AlertInfo[] = [
          { id: 'a1', timestamp: new Date(Date.now() - 300000), severity: 'medium', message: 'Line B pressure approaching threshold', source: 'Line B Pressure', acknowledged: false },
          { id: 'a2', timestamp: new Date(Date.now() - 180000), severity: 'high', message: 'Material power consumption above normal', source: 'Material Power', acknowledged: false },
          { id: 'a3', timestamp: new Date(Date.now() - 600000), severity: 'low', message: 'Packaging efficiency slightly reduced', source: 'Packaging Line', acknowledged: true }
        ]
        setAlerts(currentAlerts)

        // Generate curve data if not provided
        if (initialCurves.length === 0) {
          const generatedCurves = dataGenerator.generateCurves({
            curveCount: 100,
            pointsPerCurve: 500,
            timeSpanHours: 24,
            includeQualityIssues: true,
            includeNoise: true,
            patterns: ['sine', 'linear', 'cyclic']
          })
          setCurves(generatedCurves)
        }

      } catch (error) {
        console.error('Failed to initialize dashboard data:', error)
        setConnectionStatus('error')
      } finally {
        setIsLoading(false)
      }
    }

    initializeData()
  }, [initialCurves])

  // Auto-refresh logic
  useEffect(() => {
    if (!isAutoRefresh) return

    const interval = setInterval(() => {
      updateRealTimeData()
    }, autoRefreshInterval)

    return () => clearInterval(interval)
  }, [isAutoRefresh, autoRefreshInterval])

  // Update real-time data
  const updateRealTimeData = useCallback(() => {
    setLastUpdate(new Date())
    
    // Update sensor readings with realistic fluctuations
    setSensorReadings(prev => prev.map(sensor => {
      const fluctuation = (Math.random() - 0.5) * (sensor.threshold.max - sensor.threshold.min) * 0.02
      const newValue = Math.max(
        sensor.threshold.min, 
        Math.min(sensor.threshold.max, sensor.currentValue + fluctuation)
      )
      
      let newStatus: 'normal' | 'warning' | 'critical' = 'normal'
      if (newValue >= sensor.threshold.max * 0.95) newStatus = 'critical'
      else if (newValue >= sensor.threshold.warning) newStatus = 'warning'
      
      const trend = newValue > sensor.currentValue ? 'up' : newValue < sensor.currentValue ? 'down' : 'stable'
      
      return {
        ...sensor,
        currentValue: Math.round(newValue * 10) / 10,
        status: newStatus,
        trend,
        lastUpdate: new Date()
      }
    }))

    // Update production line efficiency
    setProductionLines(prev => prev.map(line => {
      if (line.status === 'running') {
        const efficiencyChange = (Math.random() - 0.5) * 2 // ±1% change
        const newEfficiency = Math.max(70, Math.min(100, line.efficiency + efficiencyChange))
        return { ...line, efficiency: Math.round(newEfficiency * 10) / 10 }
      }
      return line
    }))

    // Occasionally add new alerts
    if (Math.random() < 0.1) { // 10% chance per refresh
      const newAlert: AlertInfo = {
        id: `alert_${Date.now()}`,
        timestamp: new Date(),
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as any,
        message: `Automated alert: ${['Temperature spike detected', 'Efficiency drop observed', 'Maintenance window approaching'][Math.floor(Math.random() * 3)]}`,
        source: `Line ${Math.floor(Math.random() * 5) + 1}`,
        acknowledged: false
      }
      setAlerts(prev => [newAlert, ...prev.slice(0, 9)]) // Keep last 10 alerts
    }

    // Update curves with streaming data
    setCurves(prev => dataGenerator.generateStreamingUpdate(prev, 3))

  }, [])

  // Manual refresh
  const handleManualRefresh = useCallback(() => {
    updateRealTimeData()
  }, [updateRealTimeData])

  // Alert management
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ))
  }, [])

  const clearAcknowledgedAlerts = useCallback(() => {
    setAlerts(prev => prev.filter(alert => !alert.acknowledged))
  }, [])

  // Curve visibility management
  const toggleCurveVisibility = useCallback((curveId: string) => {
    setCurves(prev => prev.map(curve => 
      curve.id === curveId ? { ...curve, visible: !curve.visible } : curve
    ))
  }, [])

  // Production line filtering
  const handleLineSelection = useCallback((lineId: string, selected: boolean) => {
    setSelectedLines(prev => {
      if (selected) {
        return [...prev, lineId]
      } else {
        return prev.filter(id => id !== lineId)
      }
    })
  }, [])

  // Filter curves by selected production lines
  const filteredCurves = useMemo(() => {
    if (selectedLines.length === 0) return curves
    
    return curves.filter(curve => {
      // Match curves to production lines based on naming convention
      return selectedLines.some(lineId => {
        const line = productionLines.find(l => l.id === lineId)
        return line && curve.name.includes(line.name.split(' ')[0])
      })
    })
  }, [curves, selectedLines, productionLines])

  // Dashboard summary stats
  const dashboardStats = useMemo(() => {
    const runningLines = productionLines.filter(line => line.status === 'running').length
    const avgEfficiency = productionLines
      .filter(line => line.status === 'running')
      .reduce((sum, line) => sum + line.efficiency, 0) / Math.max(runningLines, 1)
    
    const criticalSensors = sensorReadings.filter(sensor => sensor.status === 'critical').length
    const warningSensors = sensorReadings.filter(sensor => sensor.status === 'warning').length
    const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged).length
    
    return {
      runningLines,
      totalLines: productionLines.length,
      avgEfficiency: Math.round(avgEfficiency * 10) / 10,
      criticalSensors,
      warningSensors,
      unacknowledgedAlerts,
      visibleCurves: filteredCurves.filter(c => c.visible).length,
      totalDataPoints: filteredCurves.reduce((sum, curve) => sum + curve.data.length, 0)
    }
  }, [productionLines, sensorReadings, alerts, filteredCurves])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-blue-600" />
            Manufacturing Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Real-time production monitoring • Cluster: {clusterId}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
            {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
          </Badge>
          
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <Clock className="h-4 w-4" />
            Updated: {lastUpdate.toLocaleTimeString()}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button
            variant={isAutoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            {isAutoRefresh ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{dashboardStats.runningLines}</div>
            <div className="text-sm text-gray-600">Running Lines</div>
            <div className="text-xs text-gray-500">of {dashboardStats.totalLines} total</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{dashboardStats.avgEfficiency}%</div>
            <div className="text-sm text-gray-600">Avg Efficiency</div>
            <div className="text-xs text-gray-500">across active lines</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{dashboardStats.warningSensors}</div>
            <div className="text-sm text-gray-600">Warnings</div>
            <div className="text-xs text-gray-500">sensor alerts</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{dashboardStats.criticalSensors}</div>
            <div className="text-sm text-gray-600">Critical</div>
            <div className="text-xs text-gray-500">urgent attention</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{dashboardStats.visibleCurves}</div>
            <div className="text-sm text-gray-600">Active Curves</div>
            <div className="text-xs text-gray-500">{dashboardStats.totalDataPoints.toLocaleString()} points</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{dashboardStats.unacknowledgedAlerts}</div>
            <div className="text-sm text-gray-600">New Alerts</div>
            <div className="text-xs text-gray-500">unacknowledged</div>
          </CardContent>
        </Card>
      </div>

      {/* Production Lines Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Production Lines
            </CardTitle>
            <CardDescription>Current status and efficiency of all production lines</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {productionLines.map(line => (
              <div key={line.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedLines.includes(line.id)}
                    onCheckedChange={(checked) => handleLineSelection(line.id, checked as boolean)}
                  />
                  <div>
                    <div className="font-medium">{line.name}</div>
                    {line.currentBatch && (
                      <div className="text-sm text-gray-600">Batch: {line.currentBatch}</div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge variant={
                    line.status === 'running' ? 'default' :
                    line.status === 'idle' ? 'secondary' :
                    line.status === 'maintenance' ? 'outline' : 'destructive'
                  }>
                    {line.status}
                  </Badge>
                  
                  {line.status === 'running' && (
                    <div className="text-right">
                      <div className="font-semibold">{line.efficiency}%</div>
                      <div className="text-xs text-gray-600">efficiency</div>
                    </div>
                  )}
                  
                  {line.alertCount > 0 && (
                    <Badge variant="destructive" className="h-6 w-6 rounded-full p-0 flex items-center justify-center">
                      {line.alertCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sensor Readings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Live Sensor Readings
            </CardTitle>
            <CardDescription>Real-time sensor data with status indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sensorReadings.map(sensor => (
              <div key={sensor.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${
                    sensor.status === 'normal' ? 'bg-green-500' :
                    sensor.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <div className="font-medium">{sensor.name}</div>
                    <div className="text-xs text-gray-600">
                      Updated {Math.round((Date.now() - sensor.lastUpdate.getTime()) / 1000)}s ago
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">
                      {sensor.currentValue} {sensor.unit}
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-1">
                      {sensor.trend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
                      {sensor.trend === 'down' && <TrendingDown className="h-3 w-3 text-green-500" />}
                      {sensor.trend === 'stable' && <Minus className="h-3 w-3 text-gray-500" />}
                      {sensor.trend}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Panel */}
      {showAlerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Active Alerts ({dashboardStats.unacknowledgedAlerts} new)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearAcknowledgedAlerts}>
                  Clear Acknowledged
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAlerts(false)}>
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.acknowledged ? 'bg-gray-50 border-gray-200' : 'bg-white border-orange-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      alert.severity === 'critical' ? 'bg-red-500' :
                      alert.severity === 'high' ? 'bg-orange-500' :
                      alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div>
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-sm text-gray-600">
                        {alert.source} • {alert.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Manufacturing Data Visualization</CardTitle>
              <CardDescription>
                Real-time sensor data from {dashboardStats.runningLines} active production lines
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="6h">Last 6 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <HighPerformanceChart
            curves={filteredCurves}
            title="Live Manufacturing Data"
            height={500}
            timeRange={timeRange}
            onTimeRangeChange={(range) => setTimeRange(range as any)}
            loading={isLoading}
            enablePerformanceMode={true}
            autoOptimize={true}
          />
        </CardContent>
      </Card>

      {/* Performance Summary */}
      {dashboardStats.visibleCurves > 0 && (
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-green-600 rounded-full flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  🎯 Real-Time Manufacturing Dashboard Active
                </h3>
                <p className="text-green-700">
                  Monitoring {dashboardStats.runningLines} production lines with {dashboardStats.visibleCurves} live data curves. 
                  Auto-refresh every {autoRefreshInterval / 1000} seconds with {dashboardStats.totalDataPoints.toLocaleString()} data points.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
