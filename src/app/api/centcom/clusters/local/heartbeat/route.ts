import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/supabase-direct'
import jwt from 'jsonwebtoken'

interface ProjectMetadata {
  project_id: string
  project_name: string
  created_at: string
  last_updated_at: string
  measurement_count: number
  table_names: string[]
}

interface HeartbeatRequest {
  status: {
    is_running: boolean
    uptime_seconds: number
    version: string // ClickHouse version
    health?: 'healthy' | 'degraded' | 'offline' // NEW: Health status
    last_error?: string // NEW: Last error message
  }
  usage_metrics: {
    storage_used_gb: number
    storage_bytes: number
    queries_this_month: number
    project_count: number
    measurement_count: number
    table_count: number
  }
  projects?: ProjectMetadata[] // NEW: Project metadata
  last_sync_at?: string
}

interface HeartbeatResponse {
  success: true
  cluster_status: 'healthy' | 'warning' | 'critical' | 'offline'
  should_throttle: boolean
  warnings: Array<{
    type: string
    message: string
    severity: 'info' | 'warning' | 'critical'
  }>
  next_heartbeat_seconds: number
  sync_token?: string // New token if renewal needed
  limits?: {
    storage_used_percentage: number
    queries_used_percentage: number
  }
}

export async function POST(request: NextRequest) {
  try {
    // Extract sync token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        error: 'Missing or invalid Authorization header'
      }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Verify sync token
    let decoded: any
    try {
      const signingKey = process.env.CENTCOM_SIGNING_KEY || 'default-dev-key'
      decoded = jwt.verify(token, signingKey)
    } catch (jwtError: any) {
      console.log('❌ Invalid sync token:', jwtError.message)
      return NextResponse.json({
        error: 'Invalid or expired sync token. Please re-register your cluster.',
        code: 'SYNC_TOKEN_INVALID'
      }, { status: 401 })
    }

    const { cluster_id, machine_fingerprint, user_id, license_id } = decoded

    if (!cluster_id || !machine_fingerprint) {
      return NextResponse.json({
        error: 'Invalid sync token payload'
      }, { status: 401 })
    }

    console.log('✅ Heartbeat received for cluster:', cluster_id)

    // Parse request body
    const body: HeartbeatRequest = await request.json()
    const { status, usage_metrics, last_sync_at, projects } = body

    // Log enhanced data if present
    if (status.health) {
      console.log('📊 Health status:', status.health)
    }
    if (projects && projects.length > 0) {
      console.log(`📁 Received ${projects.length} projects from cluster`)
    }

    if (!status || !usage_metrics) {
      return NextResponse.json({
        error: 'Missing required fields: status or usage_metrics'
      }, { status: 400 })
    }

    // Determine health status - use provided health or derive from is_running
    const healthStatus = status.health || (status.is_running ? 'healthy' : 'offline')

    // Update cluster in database
    const { data: cluster, error: updateError } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .update({
        is_running: status.is_running,
        uptime_seconds: status.uptime_seconds,
        clickhouse_version: status.version,
        health_status: healthStatus, // NEW: Store health status
        last_error: status.last_error || null, // NEW: Store last error
        storage_used_gb: usage_metrics.storage_used_gb,
        storage_bytes: usage_metrics.storage_bytes,
        queries_this_month: usage_metrics.queries_this_month,
        project_count: usage_metrics.project_count,
        measurement_count: usage_metrics.measurement_count,
        table_count: usage_metrics.table_count,
        projects_metadata: body.projects ? JSON.stringify(body.projects) : null, // NEW: Store projects
        last_heartbeat_at: new Date().toISOString(),
        cluster_status: status.is_running ? 'online' : 'offline',
        updated_at: new Date().toISOString()
      })
      .eq('cluster_id', cluster_id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Failed to update cluster:', updateError)
      return NextResponse.json({
        error: 'Failed to update cluster status',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Cluster status updated:', cluster_id)

    // Insert history record for time-series tracking
    const { error: historyError } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage_history')
      .insert({
        cluster_id,
        storage_used_gb: usage_metrics.storage_used_gb,
        storage_bytes: usage_metrics.storage_bytes,
        queries_count: usage_metrics.queries_this_month,
        project_count: usage_metrics.project_count,
        measurement_count: usage_metrics.measurement_count,
        table_count: usage_metrics.table_count,
        is_running: status.is_running,
        uptime_seconds: status.uptime_seconds,
        recorded_at: new Date().toISOString()
      })

    if (historyError) {
      console.warn('⚠️ Failed to insert history record (non-critical):', historyError.message)
      // Don't fail heartbeat if history insert fails
    }

    // Get license to check limits
    const { data: license } = await dbOperations.supabaseAdmin
      .from('license_keys')
      .select('*')
      .eq('id', license_id)
      .single()

    if (!license) {
      console.warn('⚠️ License not found for cluster:', license_id)
      // Continue without limit checking
    }

    // Calculate aggregate usage across all user's clusters
    const { data: aggregateUsage } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .select('storage_used_gb, queries_this_month')
      .eq('user_id', user_id)
      .neq('cluster_status', 'decommissioned')

    const totalStorageGb = aggregateUsage?.reduce((sum, c) => sum + (c.storage_used_gb || 0), 0) || 0
    const totalQueries = aggregateUsage?.reduce((sum, c) => sum + (c.queries_this_month || 0), 0) || 0

    console.log('📊 Aggregate usage:', {
      totalStorageGb,
      totalQueries,
      clusterCount: aggregateUsage?.length || 0
    })

    // Check limits and generate warnings
    const warnings: Array<{ type: string; message: string; severity: 'info' | 'warning' | 'critical' }> = []
    let shouldThrottle = false
    let clusterStatus: 'healthy' | 'warning' | 'critical' | 'offline' = status.is_running ? 'healthy' : 'offline'

    const limits = license?.local_cluster_limits || {}
    const maxStorageGb = limits.max_storage_gb || 10
    const maxMonthlyQueries = limits.max_monthly_queries || 100000
    const offlineGraceDays = limits.offline_grace_days || 7

    // Check storage limits
    const storagePercentage = (totalStorageGb / maxStorageGb) * 100

    if (totalStorageGb > maxStorageGb) {
      warnings.push({
        type: 'storage_exceeded',
        message: `Storage limit exceeded: ${totalStorageGb.toFixed(2)}GB / ${maxStorageGb}GB across all clusters`,
        severity: 'critical'
      })
      shouldThrottle = true
      clusterStatus = 'critical'
    } else if (storagePercentage > 90) {
      warnings.push({
        type: 'storage_warning',
        message: `Storage usage at ${storagePercentage.toFixed(1)}% (${totalStorageGb.toFixed(2)}GB / ${maxStorageGb}GB)`,
        severity: 'warning'
      })
      clusterStatus = 'warning'
    } else if (storagePercentage > 75) {
      warnings.push({
        type: 'storage_info',
        message: `Storage usage at ${storagePercentage.toFixed(1)}%`,
        severity: 'info'
      })
    }

    // Check query limits
    const queriesPercentage = (totalQueries / maxMonthlyQueries) * 100

    if (totalQueries > maxMonthlyQueries) {
      warnings.push({
        type: 'queries_exceeded',
        message: `Monthly query limit exceeded: ${totalQueries.toLocaleString()} / ${maxMonthlyQueries.toLocaleString()} across all clusters`,
        severity: 'critical'
      })
      shouldThrottle = true
      clusterStatus = 'critical'
    } else if (queriesPercentage > 90) {
      warnings.push({
        type: 'queries_warning',
        message: `Query usage at ${queriesPercentage.toFixed(1)}% (${totalQueries.toLocaleString()} / ${maxMonthlyQueries.toLocaleString()})`,
        severity: 'warning'
      })
      if (clusterStatus === 'healthy') clusterStatus = 'warning'
    } else if (queriesPercentage > 75) {
      warnings.push({
        type: 'queries_info',
        message: `Query usage at ${queriesPercentage.toFixed(1)}%`,
        severity: 'info'
      })
    }

    // Check if cluster has been offline for grace period
    if (!status.is_running) {
      const lastHeartbeat = new Date(cluster.last_heartbeat_at || Date.now())
      const daysSinceLastHeartbeat = (Date.now() - lastHeartbeat.getTime()) / (1000 * 60 * 60 * 24)

      if (daysSinceLastHeartbeat > offlineGraceDays) {
        warnings.push({
          type: 'offline_grace_period_exceeded',
          message: `Cluster offline for ${Math.floor(daysSinceLastHeartbeat)} days (grace period: ${offlineGraceDays} days). Consider upgrading or decommissioning.`,
          severity: 'critical'
        })
        shouldThrottle = true
        clusterStatus = 'critical'
      }
    }

    // Check if license is expired
    if (license?.expires_at) {
      const expirationDate = new Date(license.expires_at)
      if (expirationDate < new Date()) {
        warnings.push({
          type: 'license_expired',
          message: `License expired on ${expirationDate.toISOString().split('T')[0]}. Please renew your license.`,
          severity: 'critical'
        })
        shouldThrottle = true
        clusterStatus = 'critical'
      } else {
        // Warn if expiring soon (within 30 days)
        const daysUntilExpiration = (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        if (daysUntilExpiration < 30) {
          warnings.push({
            type: 'license_expiring_soon',
            message: `License expires in ${Math.floor(daysUntilExpiration)} days`,
            severity: 'warning'
          })
        }
      }
    }

    // Check if sync token needs renewal (< 30 days remaining)
    const exp = decoded.exp
    const now = Math.floor(Date.now() / 1000)
    const daysUntilTokenExpiration = (exp - now) / (60 * 60 * 24)

    let newSyncToken: string | undefined

    if (daysUntilTokenExpiration < 30) {
      // Generate new 90-day sync token
      const newTokenPayload = {
        iss: 'lyceum',
        aud: 'centcom-sync',
        sub: user_id,
        cluster_id,
        machine_fingerprint,
        license_id,
        iat: now,
        exp: now + (90 * 24 * 60 * 60) // 90 days
      }

      const signingKey = process.env.CENTCOM_SIGNING_KEY || 'default-dev-key'
      newSyncToken = jwt.sign(newTokenPayload, signingKey, { algorithm: 'HS256' })

      // Update sync token hash
      const crypto = require('crypto')
      const syncTokenHash = crypto.createHash('sha256').update(newSyncToken).digest('hex')

      await dbOperations.supabaseAdmin
        .from('local_cluster_usage')
        .update({ sync_token_hash: syncTokenHash })
        .eq('cluster_id', cluster_id)

      console.log('🔄 Sync token renewed (90 days)')
    }

    const response: HeartbeatResponse = {
      success: true,
      cluster_status: clusterStatus,
      should_throttle: shouldThrottle,
      warnings,
      next_heartbeat_seconds: 600, // 10 minutes
      ...(newSyncToken && { sync_token: newSyncToken }),
      limits: {
        storage_used_percentage: storagePercentage,
        queries_used_percentage: queriesPercentage
      }
    }

    console.log('✅ Heartbeat processed:', {
      cluster_id,
      cluster_status: clusterStatus,
      should_throttle: shouldThrottle,
      warnings_count: warnings.length
    })

    return NextResponse.json(response, { status: 200 })

  } catch (error: any) {
    console.error('❌ Heartbeat error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}

// OPTIONS for CORS preflight
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin')
  const allowedOrigins = ['http://localhost:3003', 'http://localhost:3594', 'tauri://localhost', 'null']
  const corsOrigin = allowedOrigins.includes(origin || 'null') ? (origin || '*') : 'http://localhost:3003'

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
