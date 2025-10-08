import { NextRequest, NextResponse } from 'next/server'
import { dbOperations } from '@/lib/supabase-direct'

export async function POST(request: NextRequest) {
  try {
    const { license_key, machine_fingerprint } = await request.json()
    
    if (!license_key || !machine_fingerprint) {
      return NextResponse.json({ 
        error: 'Missing license_key or machine_fingerprint' 
      }, { status: 400 })
    }
    
    // Find license
    const { data: license, error: licenseError } = await dbOperations.supabaseAdmin
      .from('license_keys')
      .select('*')
      .eq('key_code', license_key)
      .eq('status', 'active')
      .single()
    
    if (licenseError || !license) {
      return NextResponse.json({ 
        error: 'Invalid or inactive license' 
      }, { status: 404 })
    }
    
    // Check local cluster permission
    const { data: permission, error: permissionError } = await dbOperations.supabaseAdmin
      .rpc('check_local_cluster_allowed', { p_user_id: license.assigned_to })
    
    if (permissionError) {
      console.error('Error checking local cluster permission:', permissionError)
    }
    
    if (!permission || !permission[0]?.allowed) {
      return NextResponse.json({ 
        error: 'License does not support local clusters' 
      }, { status: 403 })
    }
    
    // Update or create usage record
    const { data: usage, error: usageError } = await dbOperations.supabaseAdmin
      .from('local_cluster_usage')
      .upsert({
        license_id: license.id,
        user_id: license.assigned_to,
        machine_fingerprint,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,machine_fingerprint'
      })
      .select()
      .single()
    
    if (usageError) {
      console.error('Usage update error:', usageError)
    }
    
    // Return license info with limits
    return NextResponse.json({
      success: true,
      license: {
        id: license.id,
        type: license.license_type,
        allows_local_cluster: license.allows_local_cluster,
        limits: license.local_cluster_limits,
        user_id: license.assigned_to,
        expires_at: license.expires_at
      },
      usage: permission[0]?.current_usage || {},
      cluster_config: {
        enabled: true,
        machine_fingerprint,
        offline_grace_days: license.local_cluster_limits?.offline_grace_days || 7
      }
    })
    
  } catch (error) {
    console.error('License verification error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

