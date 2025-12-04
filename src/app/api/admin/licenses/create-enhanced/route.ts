import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getLicenseTypeConfig, getPluginFeatures } from '@/lib/license-types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()

    // Normalize plugin ID: convert hyphens to underscores (klippel-qc -> klippel_qc)
    const normalizedPluginId = body.plugin_id?.replace(/-/g, '_') || null

    // Determine if this is a plugin license
    const isPluginLicense = body.license_category === 'plugin'

    // For plugin licenses, the actual license_type should be the plugin ID (e.g., 'klippel_qc')
    // The tier (standard, professional, etc.) is stored separately in license_config
    const effectiveLicenseType = isPluginLicense && normalizedPluginId
      ? normalizedPluginId
      : (body.license_type || 'standard')

    // Get license type configuration (using the tier for config lookup)
    const licenseTypeConfig = getLicenseTypeConfig(body.license_type || 'standard')
    if (!licenseTypeConfig) {
      return NextResponse.json({
        error: `Invalid license type: ${body.license_type}`
      }, { status: 400 })
    }

    // Generate unique license key code
    // Format: LYC-{TYPE}-{YEAR}-{RANDOM}
    // Plugin examples: LYC-KLIPPEL-2025-KKNJ93DP, LYC-APX500-2025-OI3I5JS
    // Desktop example: LYC-DESKTOP-2025-KJFS843
    const generateKeyCode = () => {
      const year = new Date().getFullYear()
      const random = Math.random().toString(36).substr(2, 8).toUpperCase()

      if (isPluginLicense && normalizedPluginId) {
        // Map plugin IDs to key prefixes
        const pluginPrefixMap: Record<string, string> = {
          'klippel_qc': 'KLIPPEL',
          'apx500': 'APX500',
          'ssj_blue': 'SSJBLUE'
        }
        const pluginPrefix = pluginPrefixMap[normalizedPluginId] || normalizedPluginId.toUpperCase().replace(/_/g, '')
        return `LYC-${pluginPrefix}-${year}-${random}`
      } else {
        // Main application / desktop license
        return `LYC-DESKTOP-${year}-${random}`
      }
    }

    const keyCode = body.key_code || body.custom_key_code || (
      body.auto_generate_key !== false ? generateKeyCode() : body.custom_key_code
    )

    if (!keyCode) {
      return NextResponse.json({ 
        error: 'License key code is required' 
      }, { status: 400 })
    }
    
    // Prepare license data with structure matching license_keys table
    const licenseData = {
      key_code: keyCode,
      // For plugin licenses, license_type MUST be the plugin ID (e.g., 'klippel_qc')
      // This is what the desktop app uses as plugin_id for validation
      license_type: effectiveLicenseType,
      // Explicitly set license_category for plugin licenses
      license_category: isPluginLicense ? 'plugin' : (body.license_category || 'main_application'),
      status: 'active',

      // Use custom values or defaults from license type config
      max_users: body.max_users || (licenseTypeConfig.max_users === -1 ? 999999 : licenseTypeConfig.max_users),
      max_projects: body.max_projects || (licenseTypeConfig.max_projects === -1 ? 999999 : licenseTypeConfig.max_projects),
      max_storage_gb: body.max_storage_gb || (licenseTypeConfig.max_storage_gb === -1 ? 999999 : licenseTypeConfig.max_storage_gb),

      // Convert features to JSONB array for license_keys compatibility
      // For plugin licenses, auto-populate required features using normalized plugin ID
      features: isPluginLicense ? (
        body.plugin_features && Object.keys(body.plugin_features).length > 0
          ? Object.keys(body.plugin_features).filter(key => body.plugin_features[key])
          : getPluginFeatures(
              normalizedPluginId || '',
              body.license_type || 'standard',
              licenseTypeConfig.trial_duration_days ? true : false
            )
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
      // Use normalized plugin ID (underscores) for consistency
      enabled_plugins: isPluginLicense ? [normalizedPluginId || ''] : [],
      plugin_permissions: isPluginLicense ? {
        plugin_id: normalizedPluginId,
        plugin_name: body.plugin_name,
        plugin_version: body.plugin_version || '1.0.0',
        features: body.plugin_features || {}
      } : {},
      
      allowed_user_types: ['engineer', 'operator', 'analyst', 'admin'],
      access_level: body.license_type === 'enterprise' ? 'full' :
                   body.license_type === 'professional' ? 'advanced' :
                   body.license_type === 'standard' ? 'standard' : 'basic',

      // Local Cluster Configuration
      allows_local_cluster: body.allows_local_cluster || false,
      local_cluster_limits: body.allows_local_cluster ? {
        max_storage_gb: body.local_cluster_limits?.max_storage_gb || 10,
        max_monthly_queries: body.local_cluster_limits?.max_monthly_queries || 100000,
        max_users: body.local_cluster_limits?.max_users || 1,
        lifecycle_tiers_enabled: body.local_cluster_limits?.lifecycle_tiers_enabled || false,
        offline_grace_days: body.local_cluster_limits?.offline_grace_days || 7
      } : null,

      restrictions: {},
      license_config: {
        created_with: 'enhanced_admin_portal_v2',
        version: '2.2',
        created_at: new Date().toISOString(),
        backwards_compatible: true,
        license_tier: body.license_type,  // Store the tier (standard, professional, etc.)
        license_category: isPluginLicense ? 'plugin' : (body.license_category || 'main_application'),
        // For plugin licenses, also store the plugin type
        plugin_type: isPluginLicense ? normalizedPluginId : null,
        api_rate_limit: licenseTypeConfig.api_rate_limit,
        concurrent_sessions: licenseTypeConfig.concurrent_sessions === -1 ? 999999 : licenseTypeConfig.concurrent_sessions,
        priority_support: licenseTypeConfig.priority_support,
        sla_hours: licenseTypeConfig.sla_hours,

        // Store main app data (only for main_application licenses)
        main_app_permissions: !isPluginLicense ? (
          body.main_app_permissions || licenseTypeConfig.default_main_app_permissions
        ) : null,
        main_app_version: !isPluginLicense ? (body.main_app_version || '1.0.0') : null,
        feature_configurations: !isPluginLicense ? (
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
