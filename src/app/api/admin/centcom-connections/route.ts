import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get CentCom cluster connection history and analytics (admin only)
 * GET /api/admin/centcom-connections?timeFilter=7d
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeFilter = searchParams.get('timeFilter') || '7d'

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!serviceKey) {
      return NextResponse.json(
        { error: 'Service key not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    console.log(`🔍 Fetching CentCom connections (filter: ${timeFilter})...`)

    // Calculate time threshold
    const now = new Date()
    let timeThreshold = new Date()
    
    switch (timeFilter) {
      case '24h':
        timeThreshold.setHours(now.getHours() - 24)
        break
      case '7d':
        timeThreshold.setDate(now.getDate() - 7)
        break
      case '30d':
        timeThreshold.setDate(now.getDate() - 30)
        break
      case 'all':
      default:
        timeThreshold = new Date('2020-01-01') // Far past
        break
    }

    // Get connections data
    const { data: connections, error: connectionsError } = await supabase
      .from('centcom_cluster_connections')
      .select('*')
      .gte('created_at', timeThreshold.toISOString())
      .order('created_at', { ascending: false })
      .limit(50)

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError)
      
      // If table doesn't exist yet, return empty array
      if (connectionsError.message?.includes('does not exist') || connectionsError.code === '42P01') {
        console.log('⚠️ Table does not exist yet, returning empty array')
        return NextResponse.json({
          success: true,
          connections: [],
          stats: {
            total: 0,
            last24Hours: 0,
            uniqueUsers: 0,
            avgDurationMinutes: 0,
            mostActiveUser: ''
          },
          timeFilter,
          timestamp: new Date().toISOString(),
          note: 'No data yet - waiting for CentCom to connect'
        })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch connections', details: connectionsError.message },
        { status: 500 }
      )
    }

    // Get user and cluster data separately for enrichment
    const userIds = [...new Set((connections || []).map((c: any) => c.user_id).filter(Boolean))]
    const clusterIds = [...new Set((connections || []).map((c: any) => c.cluster_id).filter(Boolean))]
    
    // Fetch users
    const { data: users } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name')
      .in('user_id', userIds)
    
    // Fetch clusters
    const { data: clusters } = await supabase
      .from('unified_clusters')
      .select('id, name')
      .in('id', clusterIds)
    
    // Create lookup maps
    const userMap = new Map(users?.map(u => [u.user_id, u]) || [])
    const clusterMap = new Map(clusters?.map(c => [c.id, c]) || [])
    
    // Calculate statistics
    const enrichedConnections = (connections || []).map((conn: any) => {
      const user = userMap.get(conn.user_id)
      const cluster = clusterMap.get(conn.cluster_id)
      
      return {
        id: conn.id,
        user_id: conn.user_id,
        cluster_id: conn.cluster_id,
        connection_type: conn.connection_type,
        connection_name: conn.connection_name,
        event_type: conn.event_type,
        set_as_default: conn.set_as_default,
        metadata: conn.metadata,
        created_at: conn.created_at,
        user_email: user?.email || 'Unknown',
        user_full_name: user?.full_name || 'Unknown User',
        cluster_name: cluster?.name || conn.connection_name || 'Unknown'
      }
    })

    // Calculate stats
    const stats = calculateStats(enrichedConnections)

    console.log(`✅ Found ${enrichedConnections.length} connections`)

    return NextResponse.json({
      success: true,
      connections: enrichedConnections,
      stats,
      timeFilter,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in centcom-connections API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function calculateStats(connections: any[]) {
  const now = new Date()
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  const recentConnections = connections.filter(c => new Date(c.created_at) > last24Hours)
  const uniqueUsers = new Set(connections.map(c => c.user_id)).size
  
  // Find most active user
  const userCounts: Record<string, number> = {}
  connections.forEach(c => {
    const email = c.user_email || 'Unknown'
    userCounts[email] = (userCounts[email] || 0) + 1
  })
  
  const mostActiveUser = Object.entries(userCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || ''

  // Calculate average duration (simplified - just using time between connect/disconnect)
  const connectEvents = connections.filter(c => c.event_type === 'connect')
  const disconnectEvents = connections.filter(c => c.event_type === 'disconnect')
  
  let totalDuration = 0
  let durationCount = 0
  
  // Match connects with their subsequent disconnects
  connectEvents.forEach(connect => {
    const disconnect = disconnectEvents.find(d => 
      d.user_id === connect.user_id && 
      d.connection_name === connect.connection_name &&
      new Date(d.created_at) > new Date(connect.created_at)
    )
    
    if (disconnect) {
      const duration = new Date(disconnect.created_at).getTime() - new Date(connect.created_at).getTime()
      totalDuration += duration
      durationCount++
    }
  })
  
  const avgDurationMinutes = durationCount > 0 
    ? Math.round(totalDuration / durationCount / 1000 / 60) 
    : 0

  return {
    total: connections.length,
    last24Hours: recentConnections.length,
    uniqueUsers,
    avgDurationMinutes,
    mostActiveUser
  }
}

