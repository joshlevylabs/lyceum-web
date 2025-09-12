import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

// Helper function to check version compatibility
function isVersionCompatible(licenseVersion: string, requestedVersion: string): boolean {
  const parseLicense = licenseVersion.split('.').map(Number)
  const parseRequested = requestedVersion.split('.').map(Number)
  
  // License version must be >= requested version for compatibility
  for (let i = 0; i < Math.max(parseLicense.length, parseRequested.length); i++) {
    const licensePart = parseLicense[i] || 0
    const requestedPart = parseRequested[i] || 0
    
    if (licensePart > requestedPart) return true
    if (licensePart < requestedPart) return false
  }
  
  return true // Equal versions are compatible
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()
    
    const { 
      license_key, 
      user_id, 
      requested_version, 
      requested_features = [],
      license_category = 'main_application'  // Default to main application
    } = body

    if (!license_key || !user_id) {
      return NextResponse.json({ 
        valid: false, 
        error: 'license_key and user_id are required' 
      }, { status: 400 })
    }

    // Try to find license in both tables
    let license = null
    
    // First try 'licenses' table (Centcom format)
    const { data: centcomLicense } = await supabase
      .from('licenses')
      .select('*')
      .eq('key_id', license_key)
      .eq('user_id', user_id)
      .single()

    if (centcomLicense) {
      license = centcomLicense
    } else {
      // Try 'license_keys' table (legacy format)
      const { data: legacyLicense } = await supabase
        .from('license_keys')
        .select('*')
        .eq('key_code', license_key)
        .eq('assigned_to', user_id)
        .single()
      
      if (legacyLicense) {
        license = legacyLicense
      }
    }

    if (!license) {
      return NextResponse.json({
        valid: false,
        error: 'License not found or not assigned to user',
        code: 'LICENSE_NOT_FOUND'
      })
    }

    // Check if license is active
    if (license.status !== 'active') {
      return NextResponse.json({
        valid: false,
        error: `License is ${license.status}`,
        code: 'LICENSE_INACTIVE',
        status: license.status
      })
    }

    // Check expiration
    if (license.expires_at && new Date(license.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: 'License has expired',
        code: 'LICENSE_EXPIRED',
        expires_at: license.expires_at
      })
    }

    // Get license category (default to main_application for backwards compatibility)
    const licenseCategory = license.license_category || 'main_application'

    // Validate based on license category
    if (licenseCategory === 'main_application') {
      // Main Application License Validation
      const appVersion = license.main_app_version || '1.0.0'
      const appPermissions = license.main_app_permissions || {}
      
      // Check version compatibility
      if (requested_version && !isVersionCompatible(appVersion, requested_version)) {
        return NextResponse.json({
          valid: false,
          error: `Version ${requested_version} not supported. License supports up to ${appVersion}`,
          code: 'VERSION_INCOMPATIBLE',
          license_version: appVersion,
          requested_version
        })
      }

      // Check feature permissions for main application
      const unauthorizedFeatures = requested_features.filter(feature => !appPermissions[feature])
      
      if (unauthorizedFeatures.length > 0) {
        return NextResponse.json({
          valid: false,
          error: `Access denied to features: ${unauthorizedFeatures.join(', ')}`,
          code: 'FEATURE_ACCESS_DENIED',
          unauthorized_features: unauthorizedFeatures,
          authorized_features: Object.keys(appPermissions).filter(key => appPermissions[key])
        })
      }

      return NextResponse.json({
        valid: true,
        license_category: 'main_application',
        license_type: license.license_type,
        user_id: user_id,
        authorized_features: Object.keys(appPermissions).filter(key => appPermissions[key]),
        version_range: `<= ${appVersion}`,
        usage_limits: {
          max_users: license.max_users,
          max_projects: license.max_projects,
          max_storage_gb: license.max_storage_gb
        },
        expires_at: license.expires_at
      })

    } else if (licenseCategory === 'plugin') {
      // Plugin License Validation
      const pluginVersion = license.plugin_version || '1.0.0'
      
      // Check version compatibility
      if (requested_version && !isVersionCompatible(pluginVersion, requested_version)) {
        return NextResponse.json({
          valid: false,
          error: `Plugin version ${requested_version} not supported. License supports up to ${pluginVersion}`,
          code: 'VERSION_INCOMPATIBLE',
          license_version: pluginVersion,
          requested_version
        })
      }

      return NextResponse.json({
        valid: true,
        license_category: 'plugin',
        license_type: license.license_type,
        user_id: user_id,
        plugin_id: license.plugin_id,
        plugin_name: license.plugin_name,
        plugin_version: pluginVersion,
        version_range: `<= ${pluginVersion}`,
        features: license.features || [],
        usage_limits: {
          max_users: license.max_users,
          max_projects: license.max_projects,
          max_storage_gb: license.max_storage_gb
        },
        expires_at: license.expires_at
      })
    }

    // Unknown license category
    return NextResponse.json({
      valid: false,
      error: `Unknown license category: ${licenseCategory}`,
      code: 'INVALID_LICENSE_CATEGORY'
    })

  } catch (error) {
    console.error('License validation error:', error)
    return NextResponse.json({
      valid: false,
      error: 'Internal server error during license validation',
      code: 'VALIDATION_ERROR'
    }, { status: 500 })
  }
}
