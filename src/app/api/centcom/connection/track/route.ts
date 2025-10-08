import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function POST(request: NextRequest) {
  try {
    const { success, user, error: authError, response: authResponse } = await requireAuth(request)
    if (!success) {
      console.log('Connection tracking API - Auth failed')
      return authResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { cluster_id, connection_type, connection_name, event_type } = await request.json()
    
    if (!cluster_id) {
      return NextResponse.json({ 
        error: 'Missing cluster_id' 
      }, { status: 400 })
    }
    
    // For local clusters, we don't need cluster_user_assignments verification
    // since they're user's own local clusters
    const isLocalCluster = connection_type === 'local' || connection_type === 'centcom'
    
    if (!isLocalCluster) {
      // Only verify cluster access for cloud clusters
      const { data: assignment, error: assignmentError } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .select('*')
        .eq('cluster_id', cluster_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (assignmentError || !assignment) {
        return NextResponse.json({ 
          error: 'Cluster not found or access denied' 
        }, { status: 404 })
      }
    }
    
    // Check if this should be the default connection (if user has no default yet)
    const { data: existingConnections } = await dbOperations.supabaseAdmin
      .from('centcom_cluster_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
    
    const shouldBeDefault = !existingConnections || existingConnections.length === 0
    
    // Create connection record (using insert to track each connection event)
    const { data: connection, error: connectionError } = await dbOperations.supabaseAdmin
      .from('centcom_cluster_connections')
      .insert({
        user_id: user.id,
        cluster_id,
        connection_type: connection_type || 'cloud',
        connection_name: connection_name || 'Unknown Cluster',
        event_type: event_type || 'connect',
        is_default: shouldBeDefault,
        is_active: true,
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: request.headers.get('user-agent'),
          connection_source: 'centcom'
        }
      })
      .select()
      .single()
    
    if (connectionError) {
      console.error('Connection tracking error:', connectionError)
      return NextResponse.json({ 
        error: 'Failed to track connection',
        details: connectionError.message
      }, { status: 500 })
    }
    
    console.log(`✅ Connection tracked: ${user.email} → ${connection_name} (${connection_type})`)
    
    return NextResponse.json({
      success: true,
      connection: connection || null
    })
    
  } catch (error) {
    console.error('Connection tracking error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

