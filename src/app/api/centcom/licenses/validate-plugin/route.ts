import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, plugin_id, feature_required, version_requested } = body

    if (!user_id || !plugin_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and plugin ID are required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get user email for license lookup
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id)
    if (!authUser?.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    const email = authUser.user.email

    // Find licenses for the specific plugin
    const pluginLicenses = await getPluginLicenses(supabase, user_id, email, plugin_id)

    if (pluginLicenses.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: `No valid license found for plugin: ${plugin_id}`,
        has_access: false,
        plugin_id,
        available_plugins: await getUserPlugins(supabase, user_id, email)
      }, { status: 403 })
    }

    // Check if user has required feature access
    let hasFeatureAccess = true
    if (feature_required) {
      hasFeatureAccess = pluginLicenses.some(license => 
        license.features && license.features.includes(feature_required)
      )
    }

    // Get the best license (most recent, highest tier)
    const bestLicense = getBestLicense(pluginLicenses)

    // Check version compatibility if version is requested
    let versionCompatibility = null
    let versionAccess = true
    if (version_requested) {
      versionCompatibility = await checkVersionCompatibility(supabase, bestLicense.license_type, plugin_id, version_requested)
      versionAccess = versionCompatibility.is_compatible
    }

    // Get available versions for this plugin
    const availableVersions = await getAvailableVersions(supabase, plugin_id, bestLicense.license_type)

    // Final access decision (must have both feature and version access)
    const finalAccess = hasFeatureAccess && versionAccess

    // Log license validation for analytics
    await logLicenseValidation(supabase, user_id, plugin_id, feature_required, finalAccess, version_requested)

    return NextResponse.json({ 
      success: true, 
      has_access: finalAccess,
      plugin_id,
      version_requested,
      license: {
        id: bestLicense.key_id || bestLicense.id,
        type: bestLicense.license_type,
        expires_at: bestLicense.expires_at,
        features: bestLicense.features || ['basic_access'],
        limits: {
          max_users: bestLicense.max_users || 1,
          max_projects: bestLicense.max_projects || 1,
          max_storage_gb: bestLicense.max_storage_gb || 1
        },
        supported_versions: bestLicense.supported_versions || { min: "1.0.0", max: null }
      },
      version_compatibility: versionCompatibility,
      available_versions: availableVersions,
      feature_access: hasFeatureAccess ? feature_required : null,
      version_access: versionAccess,
      validation_timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Plugin license validation error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Get licenses for a specific plugin
async function getPluginLicenses(supabase: any, userId: string, email: string, pluginId: string) {
  const licenses = []

  // Check Centcom licenses
  const { data: centcomLicenses } = await supabase
    .from('licenses')
    .select('*')
    .or(`user_id.eq.${userId},user_id.eq.${email}`)
    .eq('plugin_id', pluginId)
    .eq('status', 'active')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  if (centcomLicenses) {
    licenses.push(...centcomLicenses)
  }

  // Check legacy licenses (assume general plugin if no specific plugin_id)
  if (pluginId === 'general' || pluginId === 'centcom') {
    const { data: legacyLicenses } = await supabase
      .from('license_keys')
      .select('*')
      .or(`assigned_to.eq.${userId},assigned_to.eq.${email}`)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (legacyLicenses) {
      licenses.push(...legacyLicenses.map(l => ({
        ...l,
        plugin_id: 'general',
        key_id: l.id
      })))
    }
  }

  return licenses
}

// Get all plugins user has access to
async function getUserPlugins(supabase: any, userId: string, email: string) {
  const plugins = new Set()

  // Get Centcom licenses
  const { data: centcomLicenses } = await supabase
    .from('licenses')
    .select('plugin_id')
    .or(`user_id.eq.${userId},user_id.eq.${email}`)
    .eq('status', 'active')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  if (centcomLicenses) {
    centcomLicenses.forEach(l => {
      if (l.plugin_id) plugins.add(l.plugin_id)
    })
  }

  // Check for general access via legacy licenses
  const { data: legacyLicenses } = await supabase
    .from('license_keys')
    .select('id')
    .or(`assigned_to.eq.${userId},assigned_to.eq.${email}`)
    .eq('status', 'active')
    .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

  if (legacyLicenses && legacyLicenses.length > 0) {
    plugins.add('general')
  }

  return Array.from(plugins)
}

// Get the best license from available licenses
function getBestLicense(licenses: any[]) {
  if (licenses.length === 1) return licenses[0]

  // Sort by license type priority and creation date
  const typePriority = {
    'enterprise': 4,
    'professional': 3,
    'standard': 2,
    'trial': 1
  }

  return licenses.sort((a, b) => {
    const aPriority = typePriority[a.license_type as keyof typeof typePriority] || 0
    const bPriority = typePriority[b.license_type as keyof typeof typePriority] || 0
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority // Higher priority first
    }
    
    // If same priority, use most recent
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })[0]
}

// Check version compatibility using database function
async function checkVersionCompatibility(supabase: any, licenseType: string, pluginId: string, version: string) {
  try {
    const { data, error } = await supabase.rpc('check_version_compatibility', {
      p_license_type: licenseType,
      p_plugin_id: pluginId,
      p_requested_version: version
    })

    if (error) {
      console.warn('Version compatibility check failed:', error)
      return { is_compatible: false, requires_upgrade: true, notes: 'Version check failed' }
    }

    return {
      is_compatible: data.is_compatible,
      requires_upgrade: data.requires_upgrade,
      version_exists: data.version_exists,
      is_stable: data.is_stable,
      notes: data.notes
    }
  } catch (error) {
    console.warn('Version compatibility error:', error)
    return { is_compatible: false, requires_upgrade: true, notes: 'Version check error' }
  }
}

// Get available versions for a plugin based on license type
async function getAvailableVersions(supabase: any, pluginId: string, licenseType: string) {
  try {
    const { data: allVersions } = await supabase
      .from('application_versions')
      .select('version_number, is_stable, is_supported, required_features, release_date')
      .eq('application_name', pluginId)
      .eq('is_supported', true)
      .order('release_date', { ascending: false })

    if (!allVersions) return []

    // Filter versions based on license compatibility
    const compatibleVersions = []
    for (const version of allVersions) {
      const compatibility = await checkVersionCompatibility(supabase, licenseType, pluginId, version.version_number)
      if (compatibility.is_compatible || licenseType === 'enterprise') {
        compatibleVersions.push({
          version: version.version_number,
          is_stable: version.is_stable,
          release_date: version.release_date,
          required_features: version.required_features,
          compatibility_status: compatibility.is_compatible ? 'compatible' : 'requires_upgrade'
        })
      }
    }

    return compatibleVersions
  } catch (error) {
    console.warn('Failed to get available versions:', error)
    return []
  }
}

// Log license validation for analytics
async function logLicenseValidation(supabase: any, userId: string, pluginId: string, feature: string | undefined, hasAccess: boolean, version?: string) {
  try {
    await supabase
      .from('license_validations')
      .insert({
        user_id: userId,
        plugin_id: pluginId,
        feature_requested: feature,
        access_granted: hasAccess,
        validated_at: new Date().toISOString(),
        client_type: 'centcom',
        client_version: version
      })
  } catch (error) {
    console.warn('Failed to log license validation:', error)
  }
}
