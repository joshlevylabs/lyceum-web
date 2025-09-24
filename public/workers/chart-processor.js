// High-performance chart data processing Web Worker
// Handles data downsampling, aggregation, and optimization for 10K+ curves

class ChartDataProcessor {
  constructor() {
    this.cache = new Map()
    this.maxCacheSize = 1000
  }

  // Intelligent data downsampling using LTTB (Largest Triangle Three Buckets) algorithm
  downsampleLTTB(data, targetPoints) {
    if (data.length <= targetPoints) return data
    if (targetPoints <= 2) return [data[0], data[data.length - 1]]

    const bucketSize = (data.length - 2) / (targetPoints - 2)
    const result = [data[0]] // Always include first point

    for (let i = 0; i < targetPoints - 2; i++) {
      const bucketStart = Math.floor(i * bucketSize) + 1
      const bucketEnd = Math.floor((i + 1) * bucketSize) + 1
      const nextBucketStart = Math.floor((i + 1) * bucketSize) + 1
      const nextBucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1)

      // Calculate average point of next bucket
      let avgX = 0, avgY = 0, avgCount = 0
      for (let j = nextBucketStart; j < nextBucketEnd; j++) {
        avgX += data[j].timestamp
        avgY += data[j].value
        avgCount++
      }
      if (avgCount > 0) {
        avgX /= avgCount
        avgY /= avgCount
      }

      // Find point in current bucket with largest triangle area
      let maxArea = -1
      let selectedPoint = null
      const prevPoint = result[result.length - 1]

      for (let j = bucketStart; j < bucketEnd; j++) {
        const area = Math.abs(
          (prevPoint.timestamp - avgX) * (data[j].value - prevPoint.value) -
          (prevPoint.timestamp - data[j].timestamp) * (avgY - prevPoint.value)
        )
        if (area > maxArea) {
          maxArea = area
          selectedPoint = data[j]
        }
      }

      if (selectedPoint) {
        result.push(selectedPoint)
      }
    }

    result.push(data[data.length - 1]) // Always include last point
    return result
  }

  // Adaptive downsampling based on data density and zoom level
  adaptiveDownsample(curves, viewport, targetPoints = 1000) {
    const processedCurves = []

    for (const curve of curves) {
      if (!curve.visible || curve.data.length === 0) {
        processedCurves.push(curve)
        continue
      }

      // Calculate cache key
      const cacheKey = `${curve.id}_${viewport.zoomLevel}_${targetPoints}_${curve.data.length}`
      
      if (this.cache.has(cacheKey)) {
        processedCurves.push({
          ...curve,
          data: this.cache.get(cacheKey)
        })
        continue
      }

      // Determine optimal point count based on zoom level
      let adaptiveTargetPoints = targetPoints
      if (viewport.zoomLevel > 3) adaptiveTargetPoints = Math.min(2000, targetPoints * 2)
      if (viewport.zoomLevel > 5) adaptiveTargetPoints = Math.min(5000, targetPoints * 4)

      // Apply downsampling
      let processedData = curve.data
      if (curve.data.length > adaptiveTargetPoints) {
        processedData = this.downsampleLTTB(curve.data, adaptiveTargetPoints)
      }

      // Cache result
      this.addToCache(cacheKey, processedData)

      processedCurves.push({
        ...curve,
        data: processedData
      })
    }

    return processedCurves
  }

  // Data aggregation for overview mode
  aggregateData(curves, timeWindow, aggregationType = 'average') {
    const aggregatedCurves = []

    for (const curve of curves) {
      if (!curve.visible || curve.data.length === 0) {
        aggregatedCurves.push(curve)
        continue
      }

      const bucketCount = Math.min(500, curve.data.length / 10)
      const timeSpan = timeWindow.end - timeWindow.start
      const bucketSize = timeSpan / bucketCount

      const aggregatedData = []

      for (let i = 0; i < bucketCount; i++) {
        const bucketStart = timeWindow.start + i * bucketSize
        const bucketEnd = bucketStart + bucketSize
        
        const bucketData = curve.data.filter(
          point => point.timestamp >= bucketStart && point.timestamp < bucketEnd
        )

        if (bucketData.length === 0) continue

        let aggregatedValue
        switch (aggregationType) {
          case 'max':
            aggregatedValue = Math.max(...bucketData.map(p => p.value))
            break
          case 'min':
            aggregatedValue = Math.min(...bucketData.map(p => p.value))
            break
          case 'average':
          default:
            aggregatedValue = bucketData.reduce((sum, p) => sum + p.value, 0) / bucketData.length
            break
        }

        aggregatedData.push({
          timestamp: bucketStart + bucketSize / 2,
          value: aggregatedValue,
          quality: this.aggregateQuality(bucketData)
        })
      }

      aggregatedCurves.push({
        ...curve,
        data: aggregatedData
      })
    }

    return aggregatedCurves
  }

  // Aggregate quality indicators
  aggregateQuality(bucketData) {
    const qualityCount = bucketData.reduce((acc, point) => {
      acc[point.quality || 'good'] = (acc[point.quality || 'good'] || 0) + 1
      return acc
    }, {})

    if (qualityCount.error > 0) return 'error'
    if (qualityCount.warning > 0) return 'warning'
    return 'good'
  }

  // Calculate data statistics
  calculateStatistics(curves) {
    const stats = {
      totalPoints: 0,
      totalCurves: curves.length,
      visibleCurves: 0,
      timeRange: { min: Infinity, max: -Infinity },
      valueRange: { min: Infinity, max: -Infinity },
      qualityDistribution: { good: 0, warning: 0, error: 0 }
    }

    for (const curve of curves) {
      if (!curve.visible) continue
      
      stats.visibleCurves++
      stats.totalPoints += curve.data.length

      for (const point of curve.data) {
        stats.timeRange.min = Math.min(stats.timeRange.min, point.timestamp)
        stats.timeRange.max = Math.max(stats.timeRange.max, point.timestamp)
        stats.valueRange.min = Math.min(stats.valueRange.min, point.value)
        stats.valueRange.max = Math.max(stats.valueRange.max, point.value)
        
        const quality = point.quality || 'good'
        stats.qualityDistribution[quality]++
      }
    }

    return stats
  }

  // Memory management
  addToCache(key, data) {
    if (this.cache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, data)
  }

  clearCache() {
    this.cache.clear()
  }

  // Performance optimization suggestions
  getOptimizationSuggestions(curves, currentPerformance) {
    const suggestions = []

    if (curves.length > 5000) {
      suggestions.push({
        type: 'warning',
        message: `Rendering ${curves.length} curves. Consider filtering or grouping data for better performance.`,
        action: 'reduce_curves'
      })
    }

    const totalPoints = curves.reduce((sum, curve) => sum + curve.data.length, 0)
    if (totalPoints > 100000) {
      suggestions.push({
        type: 'warning',
        message: `${totalPoints.toLocaleString()} total data points. Enable aggressive downsampling.`,
        action: 'enable_downsampling'
      })
    }

    if (currentPerformance.renderTime > 16) {
      suggestions.push({
        type: 'error',
        message: `Render time ${currentPerformance.renderTime}ms exceeds 60 FPS target (16ms).`,
        action: 'optimize_rendering'
      })
    }

    return suggestions
  }
}

// Web Worker message handling
const processor = new ChartDataProcessor()

self.onmessage = function(e) {
  const { id, type, data } = e.data

  try {
    let result

    switch (type) {
      case 'downsample':
        result = processor.adaptiveDownsample(data.curves, data.viewport, data.targetPoints)
        break

      case 'aggregate':
        result = processor.aggregateData(data.curves, data.timeWindow, data.aggregationType)
        break

      case 'statistics':
        result = processor.calculateStatistics(data.curves)
        break

      case 'optimize':
        result = processor.getOptimizationSuggestions(data.curves, data.performance)
        break

      case 'clear_cache':
        processor.clearCache()
        result = { success: true }
        break

      default:
        throw new Error(`Unknown processing type: ${type}`)
    }

    self.postMessage({
      id,
      type,
      success: true,
      result
    })

  } catch (error) {
    self.postMessage({
      id,
      type,
      success: false,
      error: error.message
    })
  }
}
