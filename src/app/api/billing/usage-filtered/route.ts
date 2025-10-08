import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get filtered usage data for a user - only active items they are responsible for
 * GET /api/billing/usage-filtered
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get user from session
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'No authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 })
    }

    console.log('🎯 Getting filtered usage for user:', user.id);

    // Get active licenses where user is responsible for payment (exclude gratis)
    const { data: responsibleLicenses, error: licenseError } = await supabase
      .from('license_keys')
      .select('id, key_code, license_type, status, max_users, max_projects, max_storage_gb, expires_at, created_at')
      .eq('responsible_user_id', user.id)
      .eq('status', 'active')
      .neq('license_type', 'gratis')

    // Get active clusters where user is responsible
    const { data: responsibleClusters, error: clusterError } = await supabase
      .from('user_database_clusters')
      .select('id, cluster_key, cluster_type, status, storage_size_mb, cpu_cores, ram_mb, created_at, updated_at')
      .eq('user_id', user.id)
      .eq('status', 'active')

    if (licenseError) {
      console.error('❌ License query error:', licenseError)
    }

    if (clusterError) {
      console.error('❌ Cluster query error:', clusterError)
    }

    // Process license data for billing display
    const licensesForBilling = (responsibleLicenses || []).map(license => ({
      id: license.id,
      name: license.key_code || `License ${license.id.slice(-8)}`,
      type: license.license_type,
      status: license.status,
      limits: {
        users: license.max_users,
        projects: license.max_projects,
        storage_gb: license.max_storage_gb
      },
      expires_at: license.expires_at,
      created_at: license.created_at,
      category: 'license'
    }))

    // Process cluster data for billing display
    const clustersForBilling = (responsibleClusters || []).map(cluster => ({
      id: cluster.id,
      name: cluster.cluster_key,
      type: cluster.cluster_type,
      status: cluster.status,
      resources: {
        storage_mb: cluster.storage_size_mb,
        cpu_cores: cluster.cpu_cores,
        ram_mb: cluster.ram_mb
      },
      created_at: cluster.created_at,
      updated_at: cluster.updated_at,
      category: 'cluster'
    }))

    // Calculate license counts by type for billing
    const licenseCounts: Record<string, number> = { basic: 0, professional: 0, enterprise: 0, standard: 0 }
    licensesForBilling.forEach(license => {
      if (license.type && licenseCounts.hasOwnProperty(license.type)) {
        licenseCounts[license.type]++
      } else if (license.type === 'trial') {
        licenseCounts.basic++ // Trial counts as basic for billing
      }
    })

    // Calculate cluster counts by type
    const clusterCounts: Record<string, number> = { development: 0, production: 0, analytics: 0 }
    clustersForBilling.forEach(cluster => {
      if (cluster.type && clusterCounts.hasOwnProperty(cluster.type)) {
        clusterCounts[cluster.type]++
      }
    })

    const filteredUsage = {
      user_id: user.id,
      active_licenses: licensesForBilling,
      active_clusters: clustersForBilling,
      license_counts: licenseCounts,
      cluster_counts: clusterCounts,
      total_licenses: licensesForBilling.length,
      total_clusters: clustersForBilling.length,
      billing_responsible_only: true, // Flag to indicate this is filtered data
      last_updated: new Date().toISOString()
    }

    console.log('🎯 Filtered usage data:', {
      licenses: filteredUsage.total_licenses,
      clusters: filteredUsage.total_clusters,
      license_counts: licenseCounts,
      cluster_counts: clusterCounts
    });

    return NextResponse.json({
      success: true,
      data: filteredUsage
    })

  } catch (error: any) {
    console.error('❌ Error getting filtered usage:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
