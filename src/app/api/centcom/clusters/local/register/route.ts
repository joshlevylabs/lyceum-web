import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'
import jwt from 'jsonwebtoken'

interface RegisterClusterRequest {
  machine_fingerprint: string
  license_key: string
  cluster_name?: string
  installation_id?: string
  system_info: {
    os: string
    os_version: string
    architecture: string
    hostname?: string
    cpu_cores?: number
    memory_gb?: number
  }
  clickhouse_version?: string
  centcom_version: string
}

interface RegisterClusterResponse {
  success: true
  cluster_id: string
  cluster_key: string
  sync_token: string
  sync_interval_seconds: number
  license: {
    license_type: string
    max_storage_gb: number
    max_monthly_queries: number
    offline_grace_days: number
    expires_at: string | null
  }
  message: string
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user with Lyceum JWT
    const { success, user, error: authError, response: authResponse } = await requireAuth(request)
    if (!success) {
      console.log('❌ Cluster registration - Auth failed:', authError)
      return authResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('✅ User authenticated for cluster registration:', user.id, user.email)

    // Parse request body
    const body: RegisterClusterRequest = await request.json()
    const {
      machine_fingerprint,
      license_key,
      cluster_name,
      installation_id,
      system_info,
      clickhouse_version,
      centcom_version
    } = body

    // Validate required fields
    if (!machine_fingerprint) {
      return NextResponse.json({
        error: 'Missing required field: machine_fingerprint'
      }, { status: 400 })
    }

    if (!license_key) {
      return NextResponse.json({
        error: 'Missing required field: license_key'
      }, { status: 400 })
    }

    if (!centcom_version) {
      return NextResponse.json({
        error: 'Missing required field: centcom_version'
      }, { status: 400 })
    }

    if (!system_info) {
      return NextResponse.json({
        error: 'Missing required field: system_info'
      }, { status: 400 })
    }

    console.log('📝 Registration request:', {
      machine_fingerprint,
      license_key,
      cluster_name,
      user_id: user.id
    })

    // Validate license belongs to user and supports local clusters
    const { data: license, error: licenseError } = await dbOperations.supabaseAdmin
      .from('license_keys')
      .select('*')
      .eq('key_code', license_key)
      .eq('assigned_to', user.id)
      .single()

    if (licenseError || !license) {
      console.log('❌ License not found or not assigned to user:', licenseError?.message)
      return NextResponse.json({
        error: 'Invalid license key or license not assigned to your account'
      }, { status: 403 })
    }

    if (!license.allows_local_cluster) {
      console.log('❌ License does not allow local clusters:', license_key)
      return NextResponse.json({
        error: 'Your license does not support local cluster deployment. Please upgrade your license.'
      }, { status: 403 })
    }

    console.log('✅ License validated:', {
      key_code: license.key_code,
      license_type: license.license_type,
      allows_local_cluster: license.allows_local_cluster
    })

    // Generate cluster name if not provided
    const finalClusterName = cluster_name ||
      `${system_info.hostname || system_info.os} - Analytics Cluster`

    // Upsert cluster registration
    const { data: cluster, error: clusterError } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .upsert({
        user_id: user.id,
        license_id: license.id,
        machine_fingerprint,
        cluster_name: finalClusterName,
        installation_id,
        clickhouse_version,
        centcom_version,
        machine_os: system_info.os,
        os_version: system_info.os_version,
        architecture: system_info.architecture,
        hostname: system_info.hostname,
        machine_cpu_cores: system_info.cpu_cores,
        machine_memory_gb: system_info.memory_gb,
        cluster_status: 'registered',
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,machine_fingerprint',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (clusterError) {
      console.error('❌ Failed to register cluster:', clusterError)
      return NextResponse.json({
        error: 'Failed to register cluster',
        details: clusterError.message
      }, { status: 500 })
    }

    console.log('✅ Cluster registered/updated:', {
      cluster_id: cluster.cluster_id,
      cluster_key: cluster.cluster_key,
      cluster_name: cluster.cluster_name
    })

    // Generate 90-day sync token
    const syncTokenPayload = {
      iss: 'lyceum',
      aud: 'centcom-sync',
      sub: user.id,
      cluster_id: cluster.cluster_id,
      machine_fingerprint,
      license_id: license.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days
    }

    const signingKey = process.env.CENTCOM_SIGNING_KEY || 'default-dev-key'
    const syncToken = jwt.sign(syncTokenPayload, signingKey, { algorithm: 'HS256' })

    // Store sync token hash for validation (optional security measure)
    const crypto = require('crypto')
    const syncTokenHash = crypto.createHash('sha256').update(syncToken).digest('hex')

    await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .update({ sync_token_hash: syncTokenHash })
      .eq('cluster_id', cluster.cluster_id)

    console.log('✅ Sync token generated (90-day expiration)')

    // Extract license limits from JSONB
    const limits = license.local_cluster_limits || {}
    const response: RegisterClusterResponse = {
      success: true,
      cluster_id: cluster.cluster_id,
      cluster_key: cluster.cluster_key || `LOCAL-${cluster.cluster_id.substring(0, 8).toUpperCase()}`,
      sync_token: syncToken,
      sync_interval_seconds: 600, // 10 minutes
      license: {
        license_type: license.license_type,
        max_storage_gb: limits.max_storage_gb || 10,
        max_monthly_queries: limits.max_monthly_queries || 100000,
        offline_grace_days: limits.offline_grace_days || 7,
        expires_at: license.expires_at
      },
      message: cluster.cluster_id === cluster.cluster_id
        ? 'Cluster registered successfully'
        : 'Cluster re-registered successfully'
    }

    console.log('✅ Registration complete for cluster:', cluster.cluster_id)
    return NextResponse.json(response, { status: 201 })

  } catch (error: any) {
    console.error('❌ Cluster registration error:', error)
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
