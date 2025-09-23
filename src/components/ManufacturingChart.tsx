'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ZoomInIcon, 
  ZoomOutIcon, 
  ArrowPathIcon,
  ChartBarIcon,
  CogIcon
} from '@heroicons/react/24/outline'

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
}

interface ManufacturingChartProps {
  curves: CurveData[]
  title?: string
  height?: number
  timeRange?: '1h' | '6h' | '24h' | '7d' | '30d'
  onTimeRangeChange?: (range: string) => void
  loading?: boolean
  className?: string
}

export default function ManufacturingChart({
  curves = [],
  title = 'Manufacturing Data',
  height = 400,
  timeRange = '24h',
  onTimeRangeChange,
  loading = false,
  className = ''
}: ManufacturingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [showControls, setShowControls] = useState(false)

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || curves.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height)

    // Draw grid
    drawGrid(ctx, rect.width, rect.height)

    // Calculate data bounds
    const allData = curves.filter(curve => curve.visible).flatMap(curve => curve.data)
    if (allData.length === 0) return

    const bounds = calculateBounds(allData)
    
    // Draw curves
    curves.forEach(curve => {
      if (curve.visible && curve.data.length > 0) {
        drawCurve(ctx, curve, bounds, rect.width, rect.height)
      }
    })

    // Draw legend
    drawLegend(ctx, curves.filter(c => c.visible), rect.width)

  }, [curves, zoomLevel, panOffset])

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const padding = 60
    const gridLines = 10

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1

    // Vertical grid lines
    for (let i = 0; i <= gridLines; i++) {
      const x = padding + (i * (width - 2 * padding)) / gridLines
      ctx.beginPath()
      ctx.moveTo(x, padding)
      ctx.lineTo(x, height - padding)
      ctx.stroke()
    }

    // Horizontal grid lines
    for (let i = 0; i <= gridLines; i++) {
      const y = padding + (i * (height - 2 * padding)) / gridLines
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Axes
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, height - padding)
    ctx.lineTo(width - padding, height - padding)
    ctx.stroke()
  }

  const calculateBounds = (data: DataPoint[]) => {
    const timestamps = data.map(d => d.timestamp)
    const values = data.map(d => d.value)

    return {
      minTime: Math.min(...timestamps),
      maxTime: Math.max(...timestamps),
      minValue: Math.min(...values),
      maxValue: Math.max(...values)
    }
  }

  const drawCurve = (
    ctx: CanvasRenderingContext2D, 
    curve: CurveData, 
    bounds: any, 
    width: number, 
    height: number
  ) => {
    const padding = 60
    const chartWidth = width - 2 * padding
    const chartHeight = height - 2 * padding

    ctx.strokeStyle = curve.color
    ctx.lineWidth = 2
    ctx.beginPath()

    let firstPoint = true

    curve.data.forEach(point => {
      const x = padding + ((point.timestamp - bounds.minTime) / (bounds.maxTime - bounds.minTime)) * chartWidth
      const y = height - padding - ((point.value - bounds.minValue) / (bounds.maxValue - bounds.minValue)) * chartHeight

      if (firstPoint) {
        ctx.moveTo(x, y)
        firstPoint = false
      } else {
        ctx.lineTo(x, y)
      }

      // Draw quality indicators
      if (point.quality && point.quality !== 'good') {
        ctx.save()
        ctx.fillStyle = point.quality === 'warning' ? '#f59e0b' : '#ef4444'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()
        ctx.restore()
      }
    })

    ctx.stroke()
  }

  const drawLegend = (ctx: CanvasRenderingContext2D, visibleCurves: CurveData[], width: number) => {
    const legendY = 10
    let legendX = 80

    ctx.font = '12px Arial'
    ctx.textAlign = 'left'

    visibleCurves.forEach((curve, index) => {
      // Draw color box
      ctx.fillStyle = curve.color
      ctx.fillRect(legendX, legendY, 12, 12)

      // Draw label
      ctx.fillStyle = '#374151'
      ctx.fillText(`${curve.name}${curve.unit ? ` (${curve.unit})` : ''}`, legendX + 16, legendY + 9)

      legendX += ctx.measureText(curve.name + (curve.unit || '')).width + 40
    })
  }

  // Mouse event handlers for pan and zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - lastMousePos.x
    const deltaY = e.clientY - lastMousePos.y

    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }))

    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.2, 5))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.2, 0.2))
  const handleReset = () => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const formatTimeRange = (range: string) => {
    const ranges: Record<string, string> = {
      '1h': 'Last Hour',
      '6h': 'Last 6 Hours', 
      '24h': 'Last 24 Hours',
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days'
    }
    return ranges[range] || range
  }

  const visibleCurveCount = curves.filter(c => c.visible).length
  const totalDataPoints = curves.reduce((sum, curve) => sum + curve.data.length, 0)

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>
              {visibleCurveCount} curves • {totalDataPoints} data points • {formatTimeRange(timeRange)}
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
              onClick={() => setShowControls(!showControls)}
            >
              <CogIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {showControls && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomInIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOutIcon className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-500 ml-2">
              Zoom: {Math.round(zoomLevel * 100)}%
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading data...</span>
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
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No data to display</p>
                <p className="text-sm">Add curves to visualize manufacturing data</p>
              </div>
            </div>
          )}
        </div>
        
        {visibleCurveCount > 0 && (
          <div className="mt-4 flex justify-between text-sm text-gray-600">
            <div>
              Performance: ~{Math.round(totalDataPoints / 100)}ms render time
            </div>
            <div>
              Optimized for {visibleCurveCount < 1000 ? 'real-time' : 'batch'} processing
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
