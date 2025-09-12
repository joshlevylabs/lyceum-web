import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    
    console.log('Creating license with data:', body)
    
    // Validate required fields
    if (!body.license_type) {
      return NextResponse.json({ 
        error: 'License type is required' 
      }, { status: 400 })
    }
    
    // Generate license key if needed
    const generateKeyCode = (licenseType: string) => {
      const prefix = `LYC-${licenseType.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}`
      const random = Math.random().toString(36).substr(2, 6).toUpperCase()
      return `${prefix}-${random}`
    }
    
    const keyCode = body.auto_generate_key !== false ? 
      generateKeyCode(body.license_type) : 
      body.custom_key
    
    if (!keyCode) {
      return NextResponse.json({ 
        error: 'License key is required' 
      }, { status: 400 })
    }
    
    // Prepare license data
    const licenseData = {
      key_code: keyCode,
      license_type: body.license_type,
      status: 'active',
      max_users: body.max_users || 10,
      max_projects: body.max_projects || 50,
      max_storage_gb: body.max_storage_gb || 25,
      features: body.features || [],
      expires_at: body.expires_at || null,
      assigned_to: null, // Will be set if assign_to_email is provided
      created_by: 'a0000000-0000-0000-0000-000000000001', // Super admin ID
      
      // Enhanced licensing fields
      time_limit_type: body.time_limit_type || 'unlimited',
      custom_trial_days: body.custom_trial_days || null,
      trial_extension_reason: body.trial_extension_reason || null,
      enabled_plugins: body.enabled_plugins || [],
      plugin_permissions: body.plugin_permissions || {},
      allowed_user_types: body.allowed_user_types || ['engineer', 'operator'],
      access_level: body.access_level || 'standard',
      restrictions: body.restrictions || {},
      license_config: {
        ...body.license_config,
        created_with: 'admin_portal',
        version: '2.0',
        created_at: new Date().toISOString()
      },
      usage_stats: {}
    }
    
    // Handle user assignment if email provided
    if (body.assign_to_email) {
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', body.assign_to_email)
        .single()
      
      if (user) {
        licenseData.assigned_to = user.id
      } else {
        console.warn('User not found for email:', body.assign_to_email)
      }
    }
    
    // Insert the license
    const { data: license, error } = await supabase
      .from('license_keys')
      .insert([licenseData])
      .select()
      .single()
    
    if (error) {
      console.error('License creation error:', error)
      return NextResponse.json({
        error: 'Failed to create license',
        details: error.message,
        supabase_error: error
      }, { status: 400 })
    }
    
    // Create onboarding entry if user assigned
    if (licenseData.assigned_to) {
      const onboardingData = {
        user_id: licenseData.assigned_to,
        assigned_license: license.id,
        onboarding_stage: 'license_assignment',
        assigned_admin: 'a0000000-0000-0000-0000-000000000001',
        notes: `License ${license.key_code} automatically assigned`
      }
      
      await supabase
        .from('user_onboarding')
        .insert([onboardingData])
    }
    
    console.log('License created successfully:', license)
    
    return NextResponse.json({
      success: true,
      message: 'License created successfully',
      license: license,
      key_code: license.key_code
    })
    
  } catch (error) {
    console.error('License creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create license', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
