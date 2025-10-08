import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { success, user, error: authError, response: authResponse } = await requireAuth(request)
    if (!success) {
      console.log('Cluster discovery API - Auth failed')
      return authResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get all clusters assigned to this user
    const { data: clusters, error: clustersError } = await dbOperations.supabaseAdmin
      .rpc('get_user_clusters', { p_user_id: user.id })
    
    if (clustersError) {
      console.error('Error fetching clusters:', clustersError)
      return NextResponse.json({ 
        error: 'Failed to fetch clusters',
        details: clustersError.message
      }, { status: 500 })
    }
    
    // Format for Centcom consumption
    const connections = (clusters || []).map((cluster: any) => ({
      id: cluster.cluster_id,
      key: cluster.cluster_key,
      name: cluster.cluster_name,
      type: cluster.cluster_type,
      architecture: cluster.architecture,
      classification: cluster.classification,
      region: cluster.region,
      connection_type: cluster.connection_type,
      access_level: cluster.access_level,
      is_default: cluster.is_default,
      
      // Connection details
      connection_info: cluster.architecture === 'optimized' ? {
        endpoint: cluster.processing_endpoint,
        customer_id: cluster.customer_id,
        protocol: 'https'
      } : {
        connection_string: cluster.connection_string,
        protocol: 'clickhouse'
      },
      
      // Metadata
      last_connected_at: cluster.last_connected_at,
      discovered_at: new Date().toISOString()
    }))
    
    return NextResponse.json({
      success: true,
      clusters: connections,
      total: connections.length
    })
    
  } catch (error) {
    console.error('Cluster discovery error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

