import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLicenseTypeConfig } from '@/lib/license-types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()

    // Get license type configuration
    const licenseTypeConfig = getLicenseTypeConfig(body.license_type || 'standard')
    if (!licenseTypeConfig) {
      return NextResponse.json({ 
        error: `Invalid license type: ${body.license_type}` 
      }, { status: 400 })
    }

    // Generate unique license key code
    const keyCode = body.key_code || body.custom_key_code || (
      body.auto_generate_key !== false ? 
        `${body.license_category === 'main_application' ? 'CENTCOM' : 'PLUGIN'}-${body.license_type.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 8).toUpperCase()}` :
        body.custom_key_code
    )

    if (!keyCode) {
      return NextResponse.json({ 
        error: 'License key code is required' 
      }, { status: 400 })
    }
    
    // Prepare license data with structure matching license_keys table
    const licenseData = {
      key_code: keyCode,
      license_type: body.license_type || 'standard',
      status: 'active',
      
      // Use custom values or defaults from license type config
      max_users: body.max_users || (licenseTypeConfig.max_users === -1 ? 999999 : licenseTypeConfig.max_users),
      max_projects: body.max_projects || (licenseTypeConfig.max_projects === -1 ? 999999 : licenseTypeConfig.max_projects),
      max_storage_gb: body.max_storage_gb || (licenseTypeConfig.max_storage_gb === -1 ? 999999 : licenseTypeConfig.max_storage_gb),
      
      // Convert features to JSONB array for license_keys compatibility
      features: body.license_category === 'plugin' ? (
        body.plugin_features ? Object.keys(body.plugin_features).filter(key => body.plugin_features[key]) : []
      ) : Object.keys(body.main_app_permissions || licenseTypeConfig.default_main_app_permissions).filter(
        key => (body.main_app_permissions || licenseTypeConfig.default_main_app_permissions)[key]
      ),
      
      expires_at: body.expires_at || (
        licenseTypeConfig.trial_duration_days ? 
          new Date(Date.now() + licenseTypeConfig.trial_duration_days * 24 * 60 * 60 * 1000).toISOString() :
          null
      ),
      assigned_to: null,
      assigned_at: null,
      created_by: 'a0000000-0000-0000-0000-000000000001', // Admin ID
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      
      // Enhanced licensing fields for license_keys table
      time_limit_type: licenseTypeConfig.trial_duration_days ? 'trial_custom' : 'unlimited',
      custom_trial_days: licenseTypeConfig.trial_duration_days || null,
      trial_extension_reason: null,
      
      // Store enhanced data as JSONB in existing fields
      enabled_plugins: body.license_category === 'plugin' ? [body.plugin_id || ''] : [],
      plugin_permissions: body.license_category === 'plugin' ? {
        plugin_id: body.plugin_id,
        plugin_name: body.plugin_name,
        plugin_version: body.plugin_version || '1.0.0',
        features: body.plugin_features || {}
      } : {},
      
      allowed_user_types: ['engineer', 'operator', 'analyst', 'admin'],
      access_level: body.license_type === 'enterprise' ? 'full' : 
                   body.license_type === 'professional' ? 'advanced' : 
                   body.license_type === 'standard' ? 'standard' : 'basic',
      
      restrictions: {},
      license_config: {
        created_with: 'enhanced_admin_portal_v2',
        version: '2.2',
        created_at: new Date().toISOString(),
        backwards_compatible: true,
        license_tier: body.license_type,
        license_category: body.license_category || 'main_application',
        api_rate_limit: licenseTypeConfig.api_rate_limit,
        concurrent_sessions: licenseTypeConfig.concurrent_sessions === -1 ? 999999 : licenseTypeConfig.concurrent_sessions,
        priority_support: licenseTypeConfig.priority_support,
        sla_hours: licenseTypeConfig.sla_hours,
        
        // Store main app data
        main_app_permissions: body.license_category === 'main_application' ? (
          body.main_app_permissions || licenseTypeConfig.default_main_app_permissions
        ) : null,
        main_app_version: body.license_category === 'main_application' ? (body.main_app_version || '1.0.0') : null,
        feature_configurations: body.license_category === 'main_application' ? (
          body.feature_configurations || licenseTypeConfig.feature_configurations
        ) : null
      },
      usage_stats: {}
    }
    
    // Handle user assignment if email provided
    if (body.assign_to_email) {
      const { data: user, error: userError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', body.assign_to_email)
        .single()
      
      if (user) {
        licenseData.assigned_to = user.id
        licenseData.assigned_at = new Date().toISOString()
      } else {
        console.warn('User not found for email:', body.assign_to_email, userError)
      }
    }
    
    // Insert the license into license_keys table
    const { data: license, error } = await supabase
      .from('license_keys')
      .insert([licenseData])
      .select()
      .single()
    
    if (error) {
      console.error('License creation error:', error)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create license', 
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      license,
      message: `Enhanced ${body.license_category || 'main_application'} license created successfully`
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
