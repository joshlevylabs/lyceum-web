import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Verify user exists and is active
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profile || !profile.is_active) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found or inactive' 
      }, { status: 404 })
    }

    // Get user's database clusters
    const { data: clusters } = await supabase
      .from('user_database_clusters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Get user's resource usage
    const { data: resourceUsage } = await supabase
      .from('user_resource_usage')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Get user's active projects count
    const { data: projects, count: projectCount } = await supabase
      .from('projects')
      .select('id', { count: 'exact' })
      .eq('created_by', userId)

    // Get user's recent analytics sessions
    const { data: recentSessions } = await supabase
      .from('analytics_sessions')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate cluster statistics
    const clusterStats = {
      total_clusters: clusters?.length || 0,
      active_clusters: clusters?.filter(c => c.status === 'active').length || 0,
      total_storage_mb: clusters?.reduce((sum, c) => sum + (c.storage_size_mb || 0), 0) || 0,
      cluster_types: clusters?.reduce((types, c) => {
        types[c.cluster_type] = (types[c.cluster_type] || 0) + 1
        return types
      }, {} as Record<string, number>) || {}
    }

    // Prepare resource summary
    const resourceSummary = {
      storage: {
        used_mb: resourceUsage?.storage_used_mb || 0,
        limit_mb: resourceUsage?.storage_limit_mb || 1024,
        percentage: resourceUsage ? Math.round((resourceUsage.storage_used_mb / resourceUsage.storage_limit_mb) * 100) : 0
      },
      bandwidth: {
        used_mb: resourceUsage?.bandwidth_used_mb || 0,
        limit_mb: resourceUsage?.bandwidth_limit_mb || 10240,
        percentage: resourceUsage ? Math.round((resourceUsage.bandwidth_used_mb / resourceUsage.bandwidth_limit_mb) * 100) : 0
      },
      api_calls: {
        used: resourceUsage?.api_calls_count || 0,
        limit: resourceUsage?.api_calls_limit || 10000,
        percentage: resourceUsage ? Math.round((resourceUsage.api_calls_count / resourceUsage.api_calls_limit) * 100) : 0
      },
      compute_hours: {
        used: resourceUsage?.compute_hours_used || 0,
        limit: resourceUsage?.compute_hours_limit || 100,
        percentage: resourceUsage ? Math.round((resourceUsage.compute_hours_used / resourceUsage.compute_hours_limit) * 100) : 0
      }
    }

    // Prepare cluster details
    const clusterDetails = clusters?.map(cluster => ({
      id: cluster.id,
      name: cluster.cluster_name,
      type: cluster.cluster_type,
      status: cluster.status,
      region: cluster.region,
      storage_size_mb: cluster.storage_size_mb,
      created_at: cluster.created_at,
      last_accessed: cluster.last_accessed,
      connection_string: cluster.status === 'active' ? cluster.connection_string : null
    })) || []

    return NextResponse.json({ 
      success: true, 
      user_id: userId,
      resources: resourceSummary,
      clusters: {
        statistics: clusterStats,
        details: clusterDetails
      },
      projects: {
        total_count: projectCount || 0,
        recent_sessions: recentSessions?.length || 0
      },
      last_updated: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('User resources error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST endpoint to update resource usage (called by Centcom during operations)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, resource_type, amount_used, operation } = body

    if (!user_id || !resource_type || amount_used === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID, resource type, and amount are required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get current resource usage
    const { data: currentUsage } = await supabase
      .from('user_resource_usage')
      .select('*')
      .eq('user_id', user_id)
      .single()

    if (!currentUsage) {
      return NextResponse.json({ 
        success: false, 
        error: 'User resource record not found' 
      }, { status: 404 })
    }

    // Calculate new usage based on operation
    const fieldMap = {
      'storage': 'storage_used_mb',
      'bandwidth': 'bandwidth_used_mb',
      'api_calls': 'api_calls_count',
      'compute_hours': 'compute_hours_used'
    }

    const field = fieldMap[resource_type as keyof typeof fieldMap]
    if (!field) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid resource type' 
      }, { status: 400 })
    }

    let newValue = currentUsage[field] || 0
    if (operation === 'add' || !operation) {
      newValue += amount_used
    } else if (operation === 'subtract') {
      newValue = Math.max(0, newValue - amount_used)
    } else if (operation === 'set') {
      newValue = amount_used
    }

    // Update resource usage
    const { data: updatedUsage, error } = await supabase
      .from('user_resource_usage')
      .update({ 
        [field]: newValue,
        last_updated: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      updated_usage: updatedUsage,
      resource_type,
      previous_value: currentUsage[field],
      new_value: newValue
    })

  } catch (error: any) {
    console.error('Resource update error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}





