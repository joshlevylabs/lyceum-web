/**
 * High-performance test data generator for manufacturing analytics
 * Generates realistic sensor data with varying patterns and quality indicators
 */

export interface DataPoint {
  timestamp: number
  value: number
  quality?: 'good' | 'warning' | 'error'
}

export interface CurveData {
  id: string
  name: string
  data: DataPoint[]
  color: string
  unit?: string
  visible: boolean
  lineWidth?: number
  alpha?: number
}

export interface GeneratorConfig {
  curveCount: number
  pointsPerCurve: number
  timeSpanHours: number
  baseTimestamp?: number
  includeQualityIssues?: boolean
  includeNoise?: boolean
  patterns?: ('sine' | 'linear' | 'exponential' | 'step' | 'random' | 'cyclic')[]
}

export class ManufacturingDataGenerator {
  private readonly sensorTypes = [
    { name: 'Temperature', unit: '°C', baseValue: 25, range: 50, color: '#ef4444' },
    { name: 'Pressure', unit: 'PSI', baseValue: 100, range: 200, color: '#3b82f6' },
    { name: 'Flow Rate', unit: 'L/min', baseValue: 50, range: 100, color: '#10b981' },
    { name: 'Vibration', unit: 'Hz', baseValue: 10, range: 20, color: '#f59e0b' },
    { name: 'Power', unit: 'kW', baseValue: 500, range: 1000, color: '#8b5cf6' },
    { name: 'Speed', unit: 'RPM', baseValue: 1000, range: 2000, color: '#06b6d4' },
    { name: 'Torque', unit: 'Nm', baseValue: 200, range: 400, color: '#ec4899' },
    { name: 'Humidity', unit: '%', baseValue: 50, range: 40, color: '#84cc16' },
    { name: 'CO2 Level', unit: 'ppm', baseValue: 400, range: 600, color: '#6b7280' },
    { name: 'Quality Score', unit: '%', baseValue: 85, range: 30, color: '#f97316' }
  ]

  private readonly colorPalette = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#6b7280', '#f97316',
    '#dc2626', '#2563eb', '#059669', '#d97706', '#7c3aed',
    '#0891b2', '#db2777', '#65a30d', '#4b5563', '#ea580c'
  ]

  /**
   * Generate realistic manufacturing sensor data
   */
  generateCurves(config: GeneratorConfig): CurveData[] {
    const {
      curveCount = 100,
      pointsPerCurve = 1000,
      timeSpanHours = 24,
      baseTimestamp = Date.now() - (timeSpanHours * 60 * 60 * 1000),
      includeQualityIssues = true,
      includeNoise = true,
      patterns = ['sine', 'linear', 'cyclic', 'step', 'random']
    } = config

    const curves: CurveData[] = []
    const timeInterval = (timeSpanHours * 60 * 60 * 1000) / pointsPerCurve

    for (let curveIndex = 0; curveIndex < curveCount; curveIndex++) {
      const sensorType = this.sensorTypes[curveIndex % this.sensorTypes.length]
      const pattern = patterns[curveIndex % patterns.length]
      const lineNumber = Math.floor(curveIndex / this.sensorTypes.length) + 1
      
      const curve: CurveData = {
        id: `curve_${curveIndex}`,
        name: `Line ${lineNumber} ${sensorType.name}`,
        data: [],
        color: this.colorPalette[curveIndex % this.colorPalette.length],
        unit: sensorType.unit,
        visible: true,
        lineWidth: curveIndex < 100 ? 2 : 1, // Thinner lines for many curves
        alpha: curveCount > 1000 ? 0.7 : 1 // Semi-transparent for extreme curve counts
      }

      // Generate data points for this curve
      for (let pointIndex = 0; pointIndex < pointsPerCurve; pointIndex++) {
        const timestamp = baseTimestamp + (pointIndex * timeInterval)
        const progress = pointIndex / pointsPerCurve
        
        let value = this.generateValue(
          sensorType,
          pattern,
          progress,
          pointIndex,
          curveIndex
        )

        // Add realistic noise
        if (includeNoise) {
          const noiseAmount = sensorType.range * 0.02 // 2% noise
          value += (Math.random() - 0.5) * noiseAmount
        }

        // Determine quality
        let quality: 'good' | 'warning' | 'error' | undefined = 'good'
        if (includeQualityIssues) {
          const qualityRoll = Math.random()
          if (qualityRoll < 0.02) quality = 'error'
          else if (qualityRoll < 0.08) quality = 'warning'
          else quality = 'good'
        }

        curve.data.push({
          timestamp,
          value: Math.round(value * 100) / 100, // Round to 2 decimal places
          quality
        })
      }

      curves.push(curve)
    }

    return curves
  }

  /**
   * Generate value based on pattern type
   */
  private generateValue(
    sensorType: any,
    pattern: string,
    progress: number,
    pointIndex: number,
    curveIndex: number
  ): number {
    const { baseValue, range } = sensorType
    const frequency = 0.1 + (curveIndex % 5) * 0.05 // Vary frequency per curve
    const phase = (curveIndex % 8) * Math.PI / 4 // Vary phase per curve
    
    let value = baseValue

    switch (pattern) {
      case 'sine':
        value += Math.sin(progress * Math.PI * 4 * frequency + phase) * (range * 0.3)
        break

      case 'linear':
        const trend = (curveIndex % 2 === 0 ? 1 : -1) * 0.5
        value += progress * range * trend
        break

      case 'exponential':
        value += Math.pow(progress, 2) * range * 0.5
        break

      case 'step':
        const stepSize = pointIndex % 100
        value += Math.floor(stepSize / 20) * (range * 0.1)
        break

      case 'cyclic':
        const cycleLength = 50 + (curveIndex % 20) * 10
        const cycleProgress = (pointIndex % cycleLength) / cycleLength
        value += Math.sin(cycleProgress * Math.PI * 2) * (range * 0.4)
        break

      case 'random':
      default:
        value += (Math.random() - 0.5) * range * 0.6
        break
    }

    // Add some manufacturing-specific behaviors
    if (sensorType.name === 'Temperature') {
      // Temperature tends to rise during production cycles
      if (pointIndex % 200 < 100) {
        value += (pointIndex % 200) * 0.2
      }
    }

    if (sensorType.name === 'Quality Score') {
      // Quality scores tend to degrade over time and reset
      const degradation = (pointIndex % 500) * -0.05
      value += degradation
      value = Math.max(60, Math.min(100, value)) // Clamp between 60-100%
    }

    return value
  }

  /**
   * Generate extreme test dataset for performance testing
   */
  generateExtremeDataset(): CurveData[] {
    console.log('Generating extreme dataset: 10,000 curves with 1,000 points each...')
    const startTime = performance.now()
    
    const curves = this.generateCurves({
      curveCount: 10000,
      pointsPerCurve: 1000,
      timeSpanHours: 168, // 1 week
      includeQualityIssues: true,
      includeNoise: true,
      patterns: ['sine', 'linear', 'cyclic', 'step', 'random']
    })
    
    const endTime = performance.now()
    console.log(`Generated ${curves.length} curves in ${Math.round(endTime - startTime)}ms`)
    
    return curves
  }

  /**
   * Generate realistic production scenario datasets
   */
  generateProductionScenarios() {
    return {
      // Small facility - 50 curves
      small: this.generateCurves({
        curveCount: 50,
        pointsPerCurve: 2000,
        timeSpanHours: 72,
        includeQualityIssues: true,
        includeNoise: true
      }),

      // Medium facility - 500 curves  
      medium: this.generateCurves({
        curveCount: 500,
        pointsPerCurve: 1500,
        timeSpanHours: 48,
        includeQualityIssues: true,
        includeNoise: true
      }),

      // Large facility - 2000 curves
      large: this.generateCurves({
        curveCount: 2000,
        pointsPerCurve: 1000,
        timeSpanHours: 24,
        includeQualityIssues: true,
        includeNoise: true
      }),

      // Enterprise - 5000 curves
      enterprise: this.generateCurves({
        curveCount: 5000,
        pointsPerCurve: 800,
        timeSpanHours: 12,
        includeQualityIssues: true,
        includeNoise: true
      }),

      // Extreme - 10000 curves (stress test)
      extreme: this.generateExtremeDataset()
    }
  }

  /**
   * Generate real-time streaming data (simulates new data points)
   */
  generateStreamingUpdate(existingCurves: CurveData[], pointCount: number = 10): CurveData[] {
    const now = Date.now()
    
    return existingCurves.map(curve => {
      const newPoints: DataPoint[] = []
      const lastTimestamp = curve.data.length > 0 
        ? curve.data[curve.data.length - 1].timestamp 
        : now - 60000 // Start 1 minute ago if no data

      for (let i = 0; i < pointCount; i++) {
        const timestamp = lastTimestamp + (i + 1) * 1000 // 1 second intervals
        
        // Generate next value based on trend from last few points
        let value = 50 // Default fallback
        if (curve.data.length > 0) {
          const recentValues = curve.data.slice(-5).map(p => p.value)
          const average = recentValues.reduce((sum, v) => sum + v, 0) / recentValues.length
          const trend = recentValues.length > 1 
            ? (recentValues[recentValues.length - 1] - recentValues[0]) / recentValues.length
            : 0
          
          value = average + trend + (Math.random() - 0.5) * 5 // Small random variation
        }

        newPoints.push({
          timestamp,
          value: Math.round(value * 100) / 100,
          quality: Math.random() < 0.95 ? 'good' : 'warning'
        })
      }

      return {
        ...curve,
        data: [...curve.data, ...newPoints]
      }
    })
  }

  /**
   * Filter curves to simulate different zoom levels and time ranges
   */
  filterCurvesForTimeRange(curves: CurveData[], timeRange: string): CurveData[] {
    const now = Date.now()
    let startTime: number

    switch (timeRange) {
      case '1h':
        startTime = now - (60 * 60 * 1000)
        break
      case '6h':
        startTime = now - (6 * 60 * 60 * 1000)
        break
      case '24h':
        startTime = now - (24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = now - (7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = now - (30 * 24 * 60 * 60 * 1000)
        break
      default:
        return curves
    }

    return curves.map(curve => ({
      ...curve,
      data: curve.data.filter(point => point.timestamp >= startTime)
    }))
  }
}

// Singleton instance for convenience
export const dataGenerator = new ManufacturingDataGenerator()
