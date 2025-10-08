import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get all CentCom local cluster usage data (admin only)
 * GET /api/admin/centcom-clusters
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!serviceKey) {
      return NextResponse.json(
        { error: 'Service key not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    console.log('🔍 Fetching all CentCom local cluster usage data...')

    // Get all local cluster usage data
    const { data: clusterUsage, error: usageError } = await supabase
      .from('local_cluster_usage')
      .select('*')
      .order('last_heartbeat_at', { ascending: false })

    if (usageError) {
      console.error('Error fetching cluster usage:', usageError)
      
      // If table doesn't exist yet, return empty array
      if (usageError.message?.includes('does not exist') || usageError.code === '42P01') {
        console.log('⚠️ Table does not exist yet, returning empty array')
        return NextResponse.json({
          success: true,
          clusters: [],
          count: 0,
          timestamp: new Date().toISOString(),
          note: 'No data yet - waiting for CentCom to connect'
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch cluster usage', details: usageError.message },
        { status: 500 }
      )
    }

    // Get user and license data separately for enrichment
    const userIds = [...new Set((clusterUsage || []).map((c: any) => c.user_id))]
    const licenseIds = [...new Set((clusterUsage || []).map((c: any) => c.license_id))]
    
    // Fetch users
    const { data: users } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name')
      .in('user_id', userIds)
    
    // Fetch licenses
    const { data: licenses } = await supabase
      .from('license_keys')
      .select('id, key_code, license_type, local_cluster_limits')
      .in('id', licenseIds)
    
    // Create lookup maps
    const userMap = new Map(users?.map(u => [u.user_id, u]) || [])
    const licenseMap = new Map(licenses?.map(l => [l.id, l]) || [])
    
    // Transform and enrich the data
    const enrichedClusters = (clusterUsage || []).map((cluster: any) => {
      const user = userMap.get(cluster.user_id)
      const license = licenseMap.get(cluster.license_id)
      const limits = license?.local_cluster_limits || {}
      
      return {
        id: cluster.id,
        user_id: cluster.user_id,
        license_id: cluster.license_id,
        machine_fingerprint: cluster.machine_fingerprint,
        storage_used_gb: cluster.storage_used_gb || 0,
        queries_this_month: cluster.queries_this_month || 0,
        clickhouse_version: cluster.clickhouse_version,
        machine_os: cluster.machine_os,
        machine_memory_gb: cluster.machine_memory_gb,
        machine_cpu_cores: cluster.machine_cpu_cores,
        last_heartbeat_at: cluster.last_heartbeat_at,
        created_at: cluster.created_at,
        updated_at: cluster.updated_at,
        
        // User info
        user_email: user?.email || 'Unknown',
        user_full_name: user?.full_name || 'Unknown User',
        
        // License info
        license_key_code: license?.key_code || 'Unknown',
        license_type: license?.license_type || 'unknown',
        
        // Limits from license
        max_storage_gb: limits.max_storage_gb || 0,
        max_monthly_queries: limits.max_monthly_queries || 0,
        offline_grace_days: limits.offline_grace_days || 30,
      }
    })

    console.log(`✅ Found ${enrichedClusters.length} CentCom local clusters`)

    return NextResponse.json({
      success: true,
      clusters: enrichedClusters,
      count: enrichedClusters.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in centcom-clusters API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

