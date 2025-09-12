import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    
    // Generate a unique license key
    const generateKeyCode = () => {
      const prefix = `LYC-TEST-${new Date().getFullYear()}`
      const random = Math.random().toString(36).substr(2, 6).toUpperCase()
      return `${prefix}-${random}`
    }
    
    // Create license data
    const licenseData = {
      key_code: generateKeyCode(),
      license_type: body.license_type || 'professional',
      status: 'active',
      max_users: body.max_users || 10,
      max_projects: body.max_projects || 50,
      max_storage_gb: body.max_storage_gb || 100,
      features: ['analytics_studio', 'collaboration'],
      time_limit_type: 'unlimited',
      enabled_plugins: ['data_export', 'real_time_collaboration'],
      allowed_user_types: ['engineer', 'operator', 'analyst'],
      access_level: 'standard',
      created_by: 'a0000000-0000-0000-0000-000000000001', // Super admin ID
      restrictions: {
        time_based: false,
        plugin_restricted: true,
        user_type_restricted: false
      },
      license_config: {
        created_with: 'debug_tool',
        version: '2.0'
      },
      usage_stats: {}
    }
    
    // Insert the license
    const { data: license, error } = await supabase
      .from('license_keys')
      .insert([licenseData])
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        attempted_data: licenseData
      }, { status: 400 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Test license created successfully',
      license: license,
      key_code: license.key_code
    })
    
  } catch (error) {
    console.error('Create test license error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Failed to create test license', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

