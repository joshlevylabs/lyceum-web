'use client'

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Activity,
  Settings,
  Download,
  Play,
  Pause
} from 'lucide-react'

interface DataPoint {
  timestamp: number
  value: number
  quality?: 'good' | 'warning' | 'error'
}

interface CurveData {
  id: string
  name: string
  data: DataPoint[]
  color: string
  unit?: string
  visible: boolean
  lineWidth?: number
  alpha?: number
}

interface ChartBounds {
  minTime: number
  maxTime: number
  minValue: number
  maxValue: number
}

interface ViewportConfig {
  zoomLevel: number
  panOffset: { x: number; y: number }
  timeWindow: { start: number; end: number }
}

interface PerformanceMetrics {
  renderTime: number
  visiblePoints: number
  totalCurves: number
  memoryUsage: number
  fps: number
}

interface HighPerformanceChartProps {
  curves: CurveData[]
  title?: string
  height?: number
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d'
  onTimeRangeChange?: (range: string) => void
  loading?: boolean
  className?: string
  maxCurves?: number
  enablePerformanceMode?: boolean
  autoOptimize?: boolean
}

export default function HighPerformanceChart({
  curves = [],
  title = 'High-Performance Manufacturing Data',
  height = 400,
  timeRange = '24h',
  onTimeRangeChange,
  loading = false,
  className = '',
  maxCurves = 10000,
  enablePerformanceMode = true,
  autoOptimize = true
}: HighPerformanceChartProps) {
  // Canvas and rendering refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()
  const workerRef = useRef<Worker>()
  
  // Chart state
  const [viewport, setViewport] = useState<ViewportConfig>({
    zoomLevel: 1,
    panOffset: { x: 0, y: 0 },
    timeWindow: { start: 0, end: 0 }
  })
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [showControls, setShowControls] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // Performance monitoring
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    visiblePoints: 0,
    totalCurves: 0,
    memoryUsage: 0,
    fps: 0
  })
  
  const [lastFrameTime, setLastFrameTime] = useState(0)
  
  // Optimized curve data with LOD (Level of Detail)
  const processedCurves = useMemo(() => {
    if (!enablePerformanceMode) return curves
    
    return curves.map(curve => {
      if (!curve.visible || curve.data.length === 0) return curve
      
      // Apply Level of Detail based on data density
      const targetPoints = viewport.zoomLevel > 2 ? 1000 : 500
      if (curve.data.length <= targetPoints) return curve
      
      // Downsample data intelligently
      const step = Math.max(1, Math.floor(curve.data.length / targetPoints))
      const downsampledData = curve.data.filter((_, index) => index % step === 0)
      
      return {
        ...curve,
        data: downsampledData
      }
    })
  }, [curves, viewport.zoomLevel, enablePerformanceMode])
  
  // Calculate chart bounds efficiently
  const chartBounds = useMemo(() => {
    const visibleCurves = processedCurves.filter(curve => curve.visible)
    if (visibleCurves.length === 0) {
      return { minTime: 0, maxTime: 1, minValue: 0, maxValue: 1 }
    }
    
    let minTime = Infinity
    let maxTime = -Infinity
    let minValue = Infinity
    let maxValue = -Infinity
    
    visibleCurves.forEach(curve => {
      curve.data.forEach(point => {
        minTime = Math.min(minTime, point.timestamp)
        maxTime = Math.max(maxTime, point.timestamp)
        minValue = Math.min(minValue, point.value)
        maxValue = Math.max(maxValue, point.value)
      })
    })
    
    // Add 5% padding
    const timeRange = maxTime - minTime
    const valueRange = maxValue - minValue
    
    return {
      minTime: minTime - timeRange * 0.05,
      maxTime: maxTime + timeRange * 0.05,
      minValue: minValue - valueRange * 0.05,
      maxValue: maxValue + valueRange * 0.05
    }
  }, [processedCurves])
  
  // High-performance canvas rendering
  const renderChart = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const startTime = performance.now()
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    
    // Set canvas size for high DPI displays
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    // Enable performance optimizations
    ctx.imageSmoothingEnabled = false
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    // Clear with solid background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    
    // Draw optimized grid
    drawOptimizedGrid(ctx, rect.width, rect.height)
    
    // Calculate visible curves and points
    const visibleCurves = processedCurves.filter(curve => curve.visible)
    let totalVisiblePoints = 0
    
    // Batch render curves for performance
    visibleCurves.forEach(curve => {
      if (curve.data.length > 0) {
        totalVisiblePoints += drawOptimizedCurve(ctx, curve, chartBounds, rect.width, rect.height)
      }
    })
    
    // Draw legend efficiently
    drawOptimizedLegend(ctx, visibleCurves, rect.width)
    
    // Update performance metrics
    const renderTime = performance.now() - startTime
    const currentTime = Date.now()
    const fps = lastFrameTime > 0 ? 1000 / (currentTime - lastFrameTime) : 0
    
    setPerformanceMetrics({
      renderTime: Math.round(renderTime * 100) / 100,
      visiblePoints: totalVisiblePoints,
      totalCurves: visibleCurves.length,
      memoryUsage: Math.round((performance as any).memory?.usedJSHeapSize / 1024 / 1024 || 0),
      fps: Math.round(fps)
    })
    
    setLastFrameTime(currentTime)
    
  }, [processedCurves, chartBounds, viewport])
  
  // Optimized grid drawing
  const drawOptimizedGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padding = 60
    const gridLines = Math.min(20, Math.max(5, Math.floor(width / 50)))
    
    // Use single path for all grid lines
    ctx.beginPath()
    ctx.strokeStyle = '#f3f4f6'
    ctx.lineWidth = 1
    
    // Vertical lines
    for (let i = 0; i <= gridLines; i++) {
      const x = padding + (i * (width - 2 * padding)) / gridLines
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
    }
    
    // Horizontal lines  
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (i * (height - 2 * padding)) / gridLines
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
    }
    
    ctx.stroke()
    
    // Draw axes
    ctx.beginPath()
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
  }
  
  // Optimized curve drawing with batching
  const drawOptimizedCurve = (
    ctx: CanvasRenderingContext2D,
    curve: CurveData,
    bounds: ChartBounds,
    width: number,
    height: number
  ): number => {
    if (curve.data.length === 0) return 0
    
    const padding = 60
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding
    
    // Pre-calculate scaling factors
    const timeScale = chartWidth / (bounds.maxTime - bounds.minTime)
    const valueScale = chartHeight / (bounds.maxValue - bounds.minValue)
    
    // Draw main curve line
    ctx.beginPath()
    ctx.strokeStyle = curve.color
    ctx.lineWidth = curve.lineWidth || 2
    ctx.globalAlpha = curve.alpha || 1
    
    let visiblePoints = 0
    let firstPoint = true
    
    // Batch process points for better performance
    const batchSize = 1000
    for (let batchStart = 0; batchStart < curve.data.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, curve.data.length)
      
      for (let i = batchStart; i < batchEnd; i++) {
        const point = curve.data[i]
        const x = padding + (point.timestamp - bounds.minTime) * timeScale
        const y = height - padding - (point.value - bounds.minValue) * valueScale
        
        // Cull points outside viewport
        if (x < 0 || x > width || y < 0 || y > height) continue
        
        visiblePoints++
        
        if (firstPoint) {
          ctx.moveTo(x, y)
          firstPoint = false
        } else {
          ctx.lineTo(x, y)
        }
      }
    }
    
    ctx.stroke()
    
    // Draw quality indicators efficiently (only for zoomed views)
    if (viewport.zoomLevel > 1.5 && curve.data.length < 5000) {
      ctx.globalAlpha = 1
      curve.data.forEach(point => {
        if (point.quality && point.quality !== 'good') {
          const x = padding + (point.timestamp - bounds.minTime) * timeScale
          const y = height - padding - (point.value - bounds.minValue) * valueScale
          
          if (x >= 0 && x <= width && y >= 0 && y <= height) {
            ctx.fillStyle = point.quality === 'warning' ? '#f59e0b' : '#ef4444'
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, 2 * Math.PI)
            ctx.fill()
          }
        }
      })
    }
    
    ctx.globalAlpha = 1
    return visiblePoints
  }
  
  // Optimized legend drawing
  const drawOptimizedLegend = (ctx: CanvasRenderingContext2D, visibleCurves: CurveData[], width: number) => {
    if (visibleCurves.length === 0) return
    
    const legendY = 15
    let legendX = 80
    const maxLegendWidth = width - 100
    
    ctx.font = '11px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'left'
    
    // Limit legend items to prevent overflow
    const maxItems = Math.floor(maxLegendWidth / 150)
    const curvesToShow = visibleCurves.slice(0, maxItems)
    
    curvesToShow.forEach(curve => {
      // Draw color indicator
      ctx.fillStyle = curve.color
      ctx.fillRect(legendX, legendY, 10, 10)
      
      // Draw text
      ctx.fillStyle = '#374151'
      const text = `${curve.name}${curve.unit ? ` (${curve.unit})` : ''}`
      ctx.fillText(text, legendX + 14, legendY + 8)
      
      legendX += Math.min(ctx.measureText(text).width + 30, 150)
    })
    
    // Show count if truncated
    if (visibleCurves.length > maxItems) {
      ctx.fillStyle = '#6b7280'
      ctx.fillText(`+${visibleCurves.length - maxItems} more`, legendX, legendY + 8)
    }
  }
  
  // Animation loop for smooth updates
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        renderChart()
        animationFrameRef.current = requestAnimationFrame(animate)
      }
      animationFrameRef.current = requestAnimationFrame(animate)
    } else {
      renderChart()
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [renderChart, isPlaying])
  
  // Mouse interaction handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }, [])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    
    const deltaX = e.clientX - lastMousePos.x
    const deltaY = e.clientY - lastMousePos.y
    
    setViewport(prev => ({
      ...prev,
      panOffset: {
        x: prev.panOffset.x + deltaX,
        y: prev.panOffset.y + deltaY
      }
    }))
    
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }, [isDragging, lastMousePos])
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])
  
  // Zoom controls
  const handleZoomIn = () => setViewport(prev => ({ ...prev, zoomLevel: Math.min(prev.zoomLevel * 1.3, 20) }))
  const handleZoomOut = () => setViewport(prev => ({ ...prev, zoomLevel: Math.max(prev.zoomLevel / 1.3, 0.1) }))
  const handleReset = () => setViewport({ zoomLevel: 1, panOffset: { x: 0, y: 0 }, timeWindow: { start: 0, end: 0 } })
  
  // Performance status
  const getPerformanceStatus = () => {
    if (performanceMetrics.totalCurves > 5000) return 'extreme'
    if (performanceMetrics.totalCurves > 1000) return 'high'
    if (performanceMetrics.totalCurves > 100) return 'medium'
    return 'low'
  }
  
  const visibleCurveCount = processedCurves.filter(c => c.visible).length
  const performanceStatus = getPerformanceStatus()
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {title}
              {performanceStatus === 'extreme' && (
                <Badge variant="secondary" className="bg-red-100 text-red-800">
                  EXTREME MODE
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-4">
              <span>{visibleCurveCount} curves • {performanceMetrics.visiblePoints} points</span>
              {performanceMetrics.renderTime > 0 && (
                <span className={performanceMetrics.renderTime > 16 ? 'text-red-600' : 'text-green-600'}>
                  {performanceMetrics.renderTime}ms render • {performanceMetrics.fps} FPS
                </span>
              )}
              {performanceMetrics.memoryUsage > 0 && (
                <span className="text-gray-500">
                  {performanceMetrics.memoryUsage}MB
                </span>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {onTimeRangeChange && (
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
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
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause animation' : 'Start animation'}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowControls(!showControls)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {showControls && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-500">
                Zoom: {Math.round(viewport.zoomLevel * 100)}%
              </span>
              <Badge variant={performanceStatus === 'extreme' ? 'destructive' : 'secondary'}>
                {performanceStatus.toUpperCase()}
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Processing {curves.length} curves...</span>
            </div>
          )}
          
          <canvas
            ref={canvasRef}
            width={800}
            height={height}
            className={`w-full border rounded cursor-${isDragging ? 'grabbing' : 'grab'}`}
            style={{ height: `${height}px` }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          
          {curves.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No data to display</p>
                <p className="text-sm">Ready for high-performance rendering up to {maxCurves.toLocaleString()} curves</p>
              </div>
            </div>
          )}
        </div>
        
        {visibleCurveCount > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg">{visibleCurveCount}</div>
              <div className="text-gray-600">Active Curves</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{performanceMetrics.visiblePoints.toLocaleString()}</div>
              <div className="text-gray-600">Data Points</div>
            </div>
            <div className="text-center">
              <div className={`font-semibold text-lg ${performanceMetrics.renderTime > 16 ? 'text-red-600' : 'text-green-600'}`}>
                {performanceMetrics.renderTime}ms
              </div>
              <div className="text-gray-600">Render Time</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{performanceMetrics.fps}</div>
              <div className="text-gray-600">FPS</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
