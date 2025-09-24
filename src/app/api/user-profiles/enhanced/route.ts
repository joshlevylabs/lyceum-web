import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get user ID from query params
    const url = new URL(request.url)
    const userId = url.searchParams.get('user_id')
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    // Fetch enhanced user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        username,
        full_name,
        avatar_url,
        company,
        role,
        created_at,
        updated_at,
        last_sign_in,
        is_active
      `)
      .eq('id', userId)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json({
        success: false,
        error: 'User profile not found'
      }, { status: 404 })
    }

    // Fetch auth user data for additional info
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)
    
    if (authError) {
      console.error('Error fetching auth user:', authError)
    }

    // Fetch the most recent CentCom login for accurate last login time
    const { data: lastCentcomLogin, error: centcomError } = await supabase
      .from('auth_logs')
      .select('created_at, ip_address, client_info')
      .eq('user_id', userId)
      .in('event_type', ['login', 'authentication'])
      .or('app_id.eq.centcom,application_type.eq.centcom,session_type.eq.centcom')
      .eq('success', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (centcomError && centcomError.code !== 'PGRST116') {
      console.error('Error fetching CentCom login:', centcomError)
    }

    // Fetch user assigned database clusters
    const { data: clusters, error: clustersError } = await supabase
      .from('cluster_user_assignments')
      .select(`
        id,
        access_level,
        assigned_at,
        expires_at,
        is_active,
        database_clusters (
          id,
          name,
          cluster_type,
          status,
          region,
          storage_per_node,
          cpu_per_node,
          memory_per_node,
          created_at,
          cluster_key,
          estimated_monthly_cost
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })

    if (clustersError) {
      console.error('Error fetching clusters:', clustersError)
    }

    // Fetch resource usage
    const { data: resourceUsage, error: resourceError } = await supabase
      .from('user_resource_usage')
      .select(`
        database_clusters_count,
        storage_used_mb,
        storage_limit_mb,
        bandwidth_used_mb,
        bandwidth_limit_mb,
        api_calls_count,
        api_calls_limit,
        compute_hours_used,
        compute_hours_limit,
        last_usage_update
      `)
      .eq('user_id', userId)
      .single()

    if (resourceError && resourceError.code !== 'PGRST116') {
      console.error('Error fetching resource usage:', resourceError)
    }

    // Calculate account statistics
    const accountCreated = new Date(profile.created_at)
    const daysSinceCreation = Math.floor((Date.now() - accountCreated.getTime()) / (1000 * 60 * 60 * 24))
    
    // Use CentCom login time if available, otherwise fall back to web login
    const lastSignIn = lastCentcomLogin?.created_at 
      ? new Date(lastCentcomLogin.created_at) 
      : (profile.last_sign_in ? new Date(profile.last_sign_in) : null)
    const daysSinceLastSignIn = lastSignIn ? Math.floor((Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24)) : null

    // Build enhanced profile data
    const enhancedProfile = {
      // Basic profile info
      id: profile.id,
      email: profile.email,
      username: profile.username,
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
      company: profile.company,
      role: profile.role,
      
      // Account status
      is_active: profile.is_active,
      account_status: profile.is_active ? 'active' : 'inactive',
      
      // Dates and timing
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      last_sign_in: lastSignIn ? lastSignIn.toISOString() : profile.last_sign_in,
      last_centcom_login: lastCentcomLogin?.created_at || null,
      last_web_login: profile.last_sign_in,
      login_source: lastCentcomLogin?.created_at ? 'centcom' : 'web',
      days_since_creation: daysSinceCreation,
      days_since_last_sign_in: daysSinceLastSignIn,
      
      // Auth user metadata
      email_confirmed: authUser?.user?.email_confirmed_at ? true : false,
      email_confirmed_at: authUser?.user?.email_confirmed_at,
      phone: authUser?.user?.phone,
      phone_confirmed: authUser?.user?.phone_confirmed_at ? true : false,
      
      // Security and access
      security_clearance: 'internal', // Default - could be enhanced later
      mfa_enabled: false, // Could be enhanced with actual MFA status
      
      // User metadata from auth
      user_metadata: authUser?.user?.user_metadata || {},
      app_metadata: authUser?.user?.app_metadata || {},
      
      // Resource usage
      resource_usage: resourceUsage || {
        database_clusters_count: 0,
        storage_used_mb: 0,
        storage_limit_mb: 1024,
        bandwidth_used_mb: 0,
        bandwidth_limit_mb: 10240,
        api_calls_count: 0,
        api_calls_limit: 10000,
        compute_hours_used: 0,
        compute_hours_limit: 100,
        last_usage_update: null
      },
      
      // Database clusters - transform assignment data to cluster data
      database_clusters: (clusters || []).map(assignment => ({
        id: assignment.database_clusters?.id,
        cluster_key: assignment.database_clusters?.cluster_key,
        cluster_name: assignment.database_clusters?.name,
        cluster_type: assignment.database_clusters?.cluster_type,
        status: assignment.database_clusters?.status,
        region: assignment.database_clusters?.region,
        storage_per_node: assignment.database_clusters?.storage_per_node,
        cpu_per_node: assignment.database_clusters?.cpu_per_node,
        memory_per_node: assignment.database_clusters?.memory_per_node,
        estimated_monthly_cost: assignment.database_clusters?.estimated_monthly_cost,
        created_at: assignment.database_clusters?.created_at,
        // Assignment-specific info
        assignment_id: assignment.id,
        access_level: assignment.access_level,
        assigned_at: assignment.assigned_at,
        expires_at: assignment.expires_at,
        is_active: assignment.is_active
      })).filter(cluster => cluster.id), // Filter out any null clusters
      
      // Account statistics
      statistics: {
        total_clusters: (clusters || []).length,
        active_clusters: (clusters || []).filter(assignment => assignment.database_clusters?.status === 'active').length,
        total_storage_mb: (clusters || []).reduce((sum, assignment) => {
          const storageStr = assignment.database_clusters?.storage_per_node || '0GB';
          const storageNum = parseInt(storageStr.replace(/[^0-9]/g, '')) || 0;
          return sum + storageNum * 1024; // Convert GB to MB
        }, 0),
        account_age_days: daysSinceCreation,
        last_activity_days_ago: daysSinceLastSignIn
      }
    }

    return NextResponse.json({
      success: true,
      data: enhancedProfile
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
