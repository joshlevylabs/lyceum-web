import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pluginId = searchParams.get('plugin_id')
    const licenseType = searchParams.get('license_type')
    const includeUnstable = searchParams.get('include_unstable') === 'true'
    const userId = searchParams.get('user_id')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // If user ID is provided, get their license type
    let userLicenseType = licenseType
    if (userId && !licenseType) {
      userLicenseType = await getUserLicenseType(supabase, userId, pluginId || 'centcom')
    }

    // Build query
    let query = supabase
      .from('application_versions')
      .select('*')
      .eq('is_supported', true)
      .order('release_date', { ascending: false })

    // Filter by plugin if specified
    if (pluginId) {
      query = query.eq('application_name', pluginId)
    }

    // Filter by stability if not including unstable
    if (!includeUnstable) {
      query = query.eq('is_stable', true)
    }

    const { data: versions, error } = await query

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message 
      }, { status: 400 })
    }

    // Group versions by application and add compatibility info
    const versionsByApp: Record<string, any[]> = {}
    
    for (const version of versions || []) {
      const appName = version.application_name
      
      if (!versionsByApp[appName]) {
        versionsByApp[appName] = []
      }

      // Check compatibility if license type is available
      let compatibility = null
      if (userLicenseType) {
        compatibility = await checkVersionCompatibility(supabase, userLicenseType, appName, version.version_number)
      }

      versionsByApp[appName].push({
        version: version.version_number,
        release_date: version.release_date,
        is_stable: version.is_stable,
        is_supported: version.is_supported,
        required_features: version.required_features || [],
        breaking_changes: version.breaking_changes || [],
        deprecation_warnings: version.deprecation_warnings || [],
        download_url: version.download_url,
        changelog_url: version.changelog_url,
        documentation_url: version.documentation_url,
        min_license_version: version.min_license_version,
        compatibility: compatibility
      })
    }

    // Get latest stable version for each app
    const latestVersions: Record<string, string> = {}
    Object.keys(versionsByApp).forEach(appName => {
      const stableVersions = versionsByApp[appName].filter(v => v.is_stable)
      if (stableVersions.length > 0) {
        latestVersions[appName] = stableVersions[0].version
      }
    })

    return NextResponse.json({ 
      success: true, 
      versions_by_application: versionsByApp,
      latest_stable_versions: latestVersions,
      user_license_type: userLicenseType,
      total_applications: Object.keys(versionsByApp).length,
      query_parameters: {
        plugin_id: pluginId,
        license_type: licenseType,
        include_unstable: includeUnstable,
        user_id: userId
      }
    })

  } catch (error: any) {
    console.error('Version listing error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Get user's best license type for a plugin
async function getUserLicenseType(supabase: any, userId: string, pluginId: string): Promise<string | null> {
  try {
    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    if (!authUser?.user) return null

    const email = authUser.user.email

    // Check Centcom licenses
    const { data: centcomLicenses } = await supabase
      .from('licenses')
      .select('license_type')
      .or(`user_id.eq.${userId},user_id.eq.${email}`)
      .eq('plugin_id', pluginId)
      .eq('status', 'active')

    // Check legacy licenses
    const { data: legacyLicenses } = await supabase
      .from('license_keys')
      .select('license_type')
      .or(`assigned_to.eq.${userId},assigned_to.eq.${email}`)
      .eq('status', 'active')

    // Combine and get best license type
    const allLicenses = [...(centcomLicenses || []), ...(legacyLicenses || [])]
    
    if (allLicenses.length === 0) return null

    // License type priority
    const priority = { 'enterprise': 4, 'professional': 3, 'standard': 2, 'trial': 1 }
    
    return allLicenses.reduce((best, current) => {
      const currentPriority = priority[current.license_type as keyof typeof priority] || 0
      const bestPriority = priority[best as keyof typeof priority] || 0
      return currentPriority > bestPriority ? current.license_type : best
    }, 'trial')

  } catch (error) {
    console.warn('Failed to get user license type:', error)
    return null
  }
}

// Check version compatibility (reused from validate-plugin)
async function checkVersionCompatibility(supabase: any, licenseType: string, pluginId: string, version: string) {
  try {
    const { data, error } = await supabase.rpc('check_version_compatibility', {
      p_license_type: licenseType,
      p_plugin_id: pluginId,
      p_requested_version: version
    })

    if (error) {
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
    return { is_compatible: false, requires_upgrade: true, notes: 'Version check error' }
  }
}





