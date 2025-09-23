import { ClickHouseClient, createClient } from '@clickhouse/client'

// ClickHouse cluster configuration
interface ClickHouseConfig {
  host: string
  port: number
  username: string
  password: string
  database?: string
  secure?: boolean
}

// Manufacturing data types for ClickHouse
interface SensorReading {
  facility_id: number
  production_line: string
  sensor_id: string
  sensor_type: 'temperature' | 'pressure' | 'flow' | 'vibration' | 'current'
  timestamp: string // ISO 8601 format
  value: number
  unit: string
  quality_score?: number
  status: 'OK' | 'WARNING' | 'ERROR' | 'MAINTENANCE'
  batch_id?: string
  operator_id?: string
  shift_id?: string
}

interface QualityMeasurement {
  measurement_id: string
  facility_id: number
  production_line: string
  batch_id: string
  timestamp: string
  measurement_type: string
  measured_value: number
  target_value: number
  tolerance_upper: number
  tolerance_lower: number
  pass_fail: 'PASS' | 'FAIL' | 'REVIEW'
  inspector_id?: string
  equipment_id?: string
}

interface ProductionEvent {
  event_id: string
  facility_id: number
  production_line: string
  timestamp: string
  event_type: 'START' | 'STOP' | 'PAUSE' | 'ALARM' | 'MAINTENANCE'
  event_category: string
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'
  description: string
  operator_id?: string
  equipment_id?: string
  duration_seconds?: number
  batch_id?: string
  resolved_at?: string
  resolved_by?: string
}

// ClickHouse connection manager
export class ClickHouseManager {
  private clients: Map<string, ClickHouseClient> = new Map()

  // Create a new ClickHouse client connection
  async createClient(config: ClickHouseConfig): Promise<ClickHouseClient> {
    const clientKey = `${config.host}:${config.port}:${config.username}`
    
    if (this.clients.has(clientKey)) {
      return this.clients.get(clientKey)!
    }

    const client = createClient({
      host: `${config.secure ? 'https' : 'http'}://${config.host}:${config.port}`,
      username: config.username,
      password: config.password,
      database: config.database || 'default',
      clickhouse_settings: {
        // Manufacturing-optimized settings
        max_execution_time: 30,
        max_memory_usage: 8000000000, // 8GB
        allow_experimental_window_functions: 1,
        optimize_move_to_prewhere: 1
      }
    })

    // Test connection
    try {
      await client.ping()
      this.clients.set(clientKey, client)
      return client
    } catch (error) {
      console.error('Failed to connect to ClickHouse:', error)
      throw new Error(`ClickHouse connection failed: ${error}`)
    }
  }

  // Close a client connection
  async closeClient(host: string, port: number, username: string): Promise<void> {
    const clientKey = `${host}:${port}:${username}`
    const client = this.clients.get(clientKey)
    
    if (client) {
      await client.close()
      this.clients.delete(clientKey)
    }
  }

  // Close all connections
  async closeAll(): Promise<void> {
    const closePromises = Array.from(this.clients.values()).map(client => client.close())
    await Promise.all(closePromises)
    this.clients.clear()
  }
}

// Manufacturing-specific ClickHouse operations
export class ManufacturingDataManager {
  constructor(private client: ClickHouseClient) {}

  // Create manufacturing data tables
  async createManufacturingTables(): Promise<void> {
    // Sensor readings table
    await this.client.command({
      query: `
        CREATE TABLE IF NOT EXISTS sensor_readings (
          facility_id UInt32,
          production_line String,
          sensor_id String,
          sensor_type Enum8('temperature' = 1, 'pressure' = 2, 'flow' = 3, 'vibration' = 4, 'current' = 5),
          timestamp DateTime64(3),
          value Float64,
          unit String,
          quality_score Float32 DEFAULT 1.0,
          status Enum8('OK' = 1, 'WARNING' = 2, 'ERROR' = 3, 'MAINTENANCE' = 4),
          batch_id String,
          operator_id String,
          shift_id String,
          
          -- Additional context
          recipe_id String,
          product_type String,
          ambient_temperature Float32,
          ambient_humidity Float32
        ) ENGINE = MergeTree()
        PARTITION BY (facility_id, toYYYYMM(timestamp))
        ORDER BY (facility_id, production_line, sensor_id, timestamp)
        TTL timestamp + INTERVAL 90 DAY TO VOLUME 'warm',
            timestamp + INTERVAL 365 DAY TO VOLUME 'cold', 
            timestamp + INTERVAL 2555 DAY TO VOLUME 'archive'
        SETTINGS index_granularity = 8192
      `
    })

    // Quality measurements table
    await this.client.command({
      query: `
        CREATE TABLE IF NOT EXISTS quality_measurements (
          measurement_id String,
          facility_id UInt32,
          production_line String,
          batch_id String,
          product_id String,
          timestamp DateTime64(3),
          
          -- Quality metrics
          measurement_type String,
          measured_value Float64,
          target_value Float64,
          tolerance_upper Float64,
          tolerance_lower Float64,
          pass_fail Enum8('PASS' = 1, 'FAIL' = 2, 'REVIEW' = 3),
          
          -- Context
          inspector_id String,
          equipment_id String,
          test_method String,
          environmental_conditions Map(String, Float64),
          
          -- Traceability
          raw_material_lot String,
          supplier_id String,
          process_parameters Map(String, Float64)
        ) ENGINE = MergeTree()
        PARTITION BY (facility_id, toYYYYMM(timestamp))
        ORDER BY (facility_id, production_line, batch_id, timestamp)
        TTL timestamp + INTERVAL 90 DAY TO VOLUME 'warm',
            timestamp + INTERVAL 365 DAY TO VOLUME 'cold',
            timestamp + INTERVAL 2555 DAY TO VOLUME 'archive'
      `
    })

    // Production events table
    await this.client.command({
      query: `
        CREATE TABLE IF NOT EXISTS production_events (
          event_id String,
          facility_id UInt32,
          production_line String,
          timestamp DateTime64(3),
          
          -- Event details
          event_type Enum8('START' = 1, 'STOP' = 2, 'PAUSE' = 3, 'ALARM' = 4, 'MAINTENANCE' = 5),
          event_category String,
          severity Enum8('INFO' = 1, 'WARNING' = 2, 'ERROR' = 3, 'CRITICAL' = 4),
          
          -- Event context
          description String,
          operator_id String,
          shift_id String,
          equipment_id String,
          
          -- Duration for start/stop events
          duration_seconds UInt32 DEFAULT 0,
          
          -- Related identifiers
          batch_id String,
          order_id String,
          recipe_id String,
          
          -- Resolution tracking
          resolved_at DateTime64(3),
          resolved_by String,
          resolution_notes String
        ) ENGINE = MergeTree()
        PARTITION BY (facility_id, toYYYYMM(timestamp))
        ORDER BY (facility_id, production_line, timestamp)
        TTL timestamp + INTERVAL 180 DAY TO VOLUME 'warm',
            timestamp + INTERVAL 730 DAY TO VOLUME 'cold',
            timestamp + INTERVAL 2555 DAY TO VOLUME 'archive'
      `
    })

    console.log('Manufacturing tables created successfully')
  }

  // Create performance optimization views
  async createOptimizationViews(): Promise<void> {
    // 1-minute aggregation view for fast rendering
    await this.client.command({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_data_1min_mv
        ENGINE = SummingMergeTree()
        ORDER BY (facility_id, production_line, sensor_id, time_bucket)
        AS SELECT
          facility_id,
          production_line,
          sensor_id,
          toStartOfMinute(timestamp) as time_bucket,
          count() as point_count,
          avg(value) as avg_value,
          min(value) as min_value,
          max(value) as max_value,
          stddevPop(value) as std_dev,
          quantiles(0.25, 0.5, 0.75)(value) as quartiles
        FROM sensor_readings
        GROUP BY facility_id, production_line, sensor_id, time_bucket
      `
    })

    // 1-hour aggregation view for longer time ranges
    await this.client.command({
      query: `
        CREATE MATERIALIZED VIEW IF NOT EXISTS sensor_data_1hour_mv
        ENGINE = SummingMergeTree()
        ORDER BY (facility_id, production_line, sensor_id, time_bucket)
        AS SELECT
          facility_id,
          production_line,
          sensor_id,
          toStartOfHour(timestamp) as time_bucket,
          count() as point_count,
          avg(value) as avg_value,
          min(value) as min_value,
          max(value) as max_value,
          stddevPop(value) as std_dev,
          quantiles(0.1, 0.25, 0.5, 0.75, 0.9)(value) as quantiles
        FROM sensor_readings
        GROUP BY facility_id, production_line, sensor_id, time_bucket
      `
    })

    console.log('Optimization views created successfully')
  }

  // Insert sensor readings in batch
  async insertSensorReadings(readings: SensorReading[]): Promise<void> {
    if (readings.length === 0) return

    const formattedData = readings.map(reading => ({
      facility_id: reading.facility_id,
      production_line: reading.production_line,
      sensor_id: reading.sensor_id,
      sensor_type: reading.sensor_type,
      timestamp: reading.timestamp,
      value: reading.value,
      unit: reading.unit,
      quality_score: reading.quality_score || 1.0,
      status: reading.status,
      batch_id: reading.batch_id || '',
      operator_id: reading.operator_id || '',
      shift_id: reading.shift_id || '',
      recipe_id: '',
      product_type: '',
      ambient_temperature: 0,
      ambient_humidity: 0
    }))

    await this.client.insert({
      table: 'sensor_readings',
      values: formattedData,
      format: 'JSONEachRow'
    })
  }

  // Query sensor data for curve rendering
  async querySensorData(
    sensorIds: string[],
    timeRange: { start: string; end: string },
    maxPoints: number = 10000
  ): Promise<any[]> {
    const duration = new Date(timeRange.end).getTime() - new Date(timeRange.start).getTime()
    const pointsPerSensor = Math.floor(maxPoints / sensorIds.length)
    
    // Choose appropriate table based on time range and required resolution
    let table = 'sensor_readings'
    let groupBy = 'toStartOfSecond(timestamp)'
    
    if (duration > 24 * 60 * 60 * 1000 && pointsPerSensor <= 1440) {
      // More than 1 day, use 1-minute aggregates
      table = 'sensor_data_1min_mv'
      groupBy = 'time_bucket'
    } else if (duration > 7 * 24 * 60 * 60 * 1000 && pointsPerSensor <= 168) {
      // More than 1 week, use 1-hour aggregates
      table = 'sensor_data_1hour_mv'
      groupBy = 'time_bucket'
    }

    const sensorList = sensorIds.map(id => `'${id}'`).join(',')
    
    const query = `
      SELECT 
        sensor_id,
        ${groupBy} as timestamp,
        ${table === 'sensor_readings' ? 'value' : 'avg_value as value'},
        ${table === 'sensor_readings' ? 'value as min_value, value as max_value' : 'min_value, max_value'}
      FROM ${table}
      WHERE sensor_id IN (${sensorList})
        AND ${table === 'sensor_readings' ? 'timestamp' : 'time_bucket'} >= '${timeRange.start}'
        AND ${table === 'sensor_readings' ? 'timestamp' : 'time_bucket'} <= '${timeRange.end}'
      ORDER BY sensor_id, timestamp
      LIMIT ${maxPoints}
    `

    const result = await this.client.query({
      query,
      format: 'JSONEachRow'
    })

    return result.json()
  }

  // Get cluster health metrics
  async getClusterHealth(): Promise<any> {
    const queries = [
      'SELECT count() as total_rows FROM sensor_readings',
      'SELECT count() as quality_rows FROM quality_measurements',
      'SELECT count() as event_rows FROM production_events',
      'SELECT formatReadableSize(sum(bytes_on_disk)) as total_size FROM system.parts'
    ]

    const results = await Promise.all(
      queries.map(query => this.client.query({ query, format: 'JSONEachRow' }))
    )

    const metrics = await Promise.all(results.map(r => r.json()))

    return {
      total_sensor_readings: metrics[0][0]?.total_rows || 0,
      total_quality_measurements: metrics[1][0]?.quality_rows || 0,
      total_production_events: metrics[2][0]?.event_rows || 0,
      total_storage_size: metrics[3][0]?.total_size || '0 B',
      timestamp: new Date().toISOString()
    }
  }

  // Test data generation for development
  async generateTestData(facilityId: number, sensorCount: number = 100): Promise<void> {
    const readings: SensorReading[] = []
    const sensorTypes: Array<SensorReading['sensor_type']> = ['temperature', 'pressure', 'flow', 'vibration', 'current']
    const productionLines = ['Line-A', 'Line-B', 'Line-C']
    
    // Generate data for the last 24 hours
    const now = new Date()
    const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    for (let i = 0; i < sensorCount; i++) {
      const sensorType = sensorTypes[i % sensorTypes.length]
      const productionLine = productionLines[i % productionLines.length]
      
      // Generate readings every minute for 24 hours
      for (let minute = 0; minute < 24 * 60; minute++) {
        const timestamp = new Date(startTime.getTime() + minute * 60 * 1000)
        
        readings.push({
          facility_id: facilityId,
          production_line: productionLine,
          sensor_id: `${sensorType}_${i.toString().padStart(3, '0')}`,
          sensor_type: sensorType,
          timestamp: timestamp.toISOString(),
          value: this.generateSensorValue(sensorType),
          unit: this.getSensorUnit(sensorType),
          quality_score: Math.random() > 0.1 ? 1.0 : Math.random() * 0.8 + 0.2,
          status: Math.random() > 0.05 ? 'OK' : (Math.random() > 0.5 ? 'WARNING' : 'ERROR'),
          batch_id: `BATCH_${Math.floor(minute / 60)}_${productionLine}`,
          operator_id: `OP_${Math.floor(Math.random() * 10)}`,
          shift_id: Math.floor(minute / 480) + 1 // 8-hour shifts
        })
      }
    }

    // Insert in batches of 10,000
    const batchSize = 10000
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize)
      await this.insertSensorReadings(batch)
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(readings.length / batchSize)}`)
    }
    
    console.log(`Generated ${readings.length} test sensor readings`)
  }

  private generateSensorValue(sensorType: SensorReading['sensor_type']): number {
    const baseValues = {
      temperature: 25, // °C
      pressure: 1.0,   // atm
      flow: 100,       // L/min
      vibration: 0.1,  // mm/s
      current: 5.0     // A
    }
    
    const base = baseValues[sensorType]
    const variation = base * 0.1 // 10% variation
    return base + (Math.random() - 0.5) * 2 * variation
  }

  private getSensorUnit(sensorType: SensorReading['sensor_type']): string {
    const units = {
      temperature: '°C',
      pressure: 'atm',
      flow: 'L/min',
      vibration: 'mm/s',
      current: 'A'
    }
    return units[sensorType]
  }
}

// Singleton instances
export const clickHouseManager = new ClickHouseManager()

// Factory function to create a manufacturing data manager
export async function createManufacturingDataManager(config: ClickHouseConfig): Promise<ManufacturingDataManager> {
  const client = await clickHouseManager.createClient(config)
  return new ManufacturingDataManager(client)
}

// Helper function to parse cluster connection string
export function parseConnectionString(connectionString: string): ClickHouseConfig {
  const url = new URL(connectionString)
  
  return {
    host: url.hostname,
    port: parseInt(url.port) || (url.protocol === 'https:' ? 8443 : 8123),
    username: url.username || 'default',
    password: url.password || '',
    database: url.pathname.slice(1) || 'default',
    secure: url.protocol === 'https:' || url.protocol === 'clickhouse-secure:'
  }
}
