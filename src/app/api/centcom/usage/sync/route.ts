import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

export async function POST(request: NextRequest) {
  try {
    const { success, user, error: authError, response: authResponse } = await requireAuth(request)
    if (!success) {
      console.log('Usage sync API - Auth failed')
      return authResponse || NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { 
      machine_fingerprint,
      storage_used_gb,
      queries_this_month,
      clickhouse_version,
      machine_info
    } = await request.json()
    
    if (!machine_fingerprint) {
      return NextResponse.json({ 
        error: 'Missing machine_fingerprint' 
      }, { status: 400 })
    }
    
    // Upsert usage (insert if not exists, update if exists)
    const { data: usage, error: updateError } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .upsert({
        user_id: user.id,
        machine_fingerprint,
        storage_used_gb: storage_used_gb || 0,
        queries_this_month: queries_this_month || 0,
        clickhouse_version,
        machine_os: machine_info?.os,
        machine_memory_gb: machine_info?.memory_gb,
        machine_cpu_cores: machine_info?.cpu_cores,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,machine_fingerprint',
        ignoreDuplicates: false
      })
      .select()
      .single()
    
    if (updateError) {
      console.error('Usage update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update usage',
        details: updateError.message
      }, { status: 500 })
    }
    
    // Get current license limits
    const { data: permission } = await dbOperations.supabaseAdmin
      .rpc('check_local_cluster_allowed', { p_user_id: user.id })
    
    const limits = permission?.[0]?.limits || {
      max_storage_gb: 10,
      max_monthly_queries: 100000
    }
    
    // Check if limits exceeded
    const warnings = []
    const storageUsed = storage_used_gb || 0
    const queriesUsed = queries_this_month || 0
    
    if (storageUsed > limits.max_storage_gb) {
      warnings.push({
        type: 'storage_exceeded',
        message: `Storage limit exceeded: ${storageUsed}GB / ${limits.max_storage_gb}GB`,
        action: 'upgrade_or_cleanup'
      })
    }
    
    if (queriesUsed > limits.max_monthly_queries) {
      warnings.push({
        type: 'queries_exceeded',
        message: `Query limit exceeded: ${queriesUsed} / ${limits.max_monthly_queries}`,
        action: 'upgrade_license'
      })
    }
    
    return NextResponse.json({
      success: true,
      usage: {
        storage_used_gb: storageUsed,
        storage_limit_gb: limits.max_storage_gb,
        queries_this_month: queriesUsed,
        query_limit: limits.max_monthly_queries,
        percentage_used: {
          storage: limits.max_storage_gb > 0 ? (storageUsed / limits.max_storage_gb) * 100 : 0,
          queries: limits.max_monthly_queries > 0 ? (queriesUsed / limits.max_monthly_queries) * 100 : 0
        }
      },
      warnings,
      should_throttle: warnings.length > 0
    })
    
  } catch (error) {
    console.error('Usage sync error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

