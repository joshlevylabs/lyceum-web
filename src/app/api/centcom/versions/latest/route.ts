import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const platform = searchParams.get('platform') // windows, macos, linux
    const currentVersion = searchParams.get('current_version')
    const userId = searchParams.get('user_id')
    const licenseType = searchParams.get('license_type')

    if (!platform) {
      return NextResponse.json({
        success: false,
        error: 'Platform parameter is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get user's license type if not provided
    let userLicenseType = licenseType
    if (userId && !licenseType) {
      userLicenseType = await getUserLicenseType(supabase, userId)
    }

    // Get user's brand type (lyceum or centcom)
    const brandType = userId
      ? await getUserBrandType(supabase, userId)
      : 'lyceum' // Default to lyceum for anonymous requests

    console.log('✅ User brand type:', brandType)

    // Get user's role to determine which release stages they can access
    const userRole = userId ? await getUserRole(supabase, userId) : null
    const isAdminOrSuperadmin = userRole === 'admin' || userRole === 'superadmin'

    console.log('✅ User role:', userRole, '- Can access testing:', isAdminOrSuperadmin)

    // Build query for latest version
    // - Regular users: production only
    // - Admin/Superadmin: testing + production
    let query = supabase
      .from('application_versions')
      .select('*')
      .eq('application_name', 'centcom')
      .eq('platform', platform)
      .eq('brand_type', brandType)
      .eq('is_stable', true)
      .eq('is_supported', true)

    // Filter by release stage based on user role
    if (isAdminOrSuperadmin) {
      // Admins can access both testing and production versions
      query = query.in('release_stage', ['testing', 'production'])
    } else {
      // Regular users only get production versions
      query = query.eq('release_stage', 'production')
    }

    const { data: latestVersion, error } = await query
      .order('release_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !latestVersion) {
      return NextResponse.json({
        success: false,
        error: 'No stable version found for this platform'
      }, { status: 404 })
    }

    // Check if update is available
    const updateAvailable = currentVersion
      ? compareVersions(latestVersion.version_number, currentVersion) > 0
      : true

    // Log update check
    if (userId) {
      await supabase.from('application_update_checks').insert({
        user_id: userId,
        application_name: 'centcom',
        current_version: currentVersion || 'unknown',
        platform: platform,
        latest_version_available: latestVersion.version_number,
        update_available: updateAvailable,
        ip_address: req.headers.get('x-forwarded-for') || null,
        user_agent: req.headers.get('user-agent')
      })
    }

    // Generate signed download URL (valid for 1 hour)
    let downloadUrl = latestVersion.download_url
    if (latestVersion.storage_path) {
      const { data: signedUrlData } = await supabase.storage
        .from('centcom-releases')
        .createSignedUrl(latestVersion.storage_path, 3600)

      if (signedUrlData?.signedUrl) {
        downloadUrl = signedUrlData.signedUrl
      }
    }

    return NextResponse.json({
      success: true,
      update_available: updateAvailable,
      current_version: currentVersion,
      latest_version: {
        version: latestVersion.version_number,
        release_date: latestVersion.release_date,
        download_url: downloadUrl,
        file_size_bytes: latestVersion.file_size_bytes,
        sha256_hash: latestVersion.sha256_hash,
        changelog_url: latestVersion.changelog_url,
        release_notes: latestVersion.breaking_changes || [],
        force_update: latestVersion.force_update || false,
        installer_type: latestVersion.installer_type,
        min_os_version: latestVersion.min_license_version
      }
    })

  } catch (error: any) {
    console.error('Latest version check error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper: Compare semantic versions
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0
    const num2 = parts2[i] || 0

    if (num1 > num2) return 1
    if (num1 < num2) return -1
  }

  return 0
}

// Helper: Get user's best license type
async function getUserLicenseType(supabase: any, userId: string): Promise<string | null> {
  try {
    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    if (!authUser?.user) return null

    const email = authUser.user.email

    // Check license_keys table (only table being used)
    const { data: licenses } = await supabase
      .from('license_keys')
      .select('license_type')
      .eq('assigned_to', userId)
      .eq('status', 'active')

    if (!licenses || licenses.length === 0) return null

    // License type priority
    const priority: Record<string, number> = {
      'enterprise': 4,
      'professional': 3,
      'standard': 2,
      'trial': 1
    }

    return licenses.reduce((best, current) => {
      const currentPriority = priority[current.license_type as keyof typeof priority] || 0
      const bestPriority = priority[best as keyof typeof priority] || 0
      return currentPriority > bestPriority ? current.license_type : best
    }, 'trial')

  } catch (error) {
    console.warn('Failed to get user license type:', error)
    return null
  }
}

// Helper: Get user's brand type based on company field in user_profiles
async function getUserBrandType(supabase: any, userId: string): Promise<string> {
  try {
    // Get user's profile and check company field
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('company')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('Failed to get user profile:', error)
      return 'lyceum' // Safe default
    }

    // Companies that should get Centcom brand
    const centcomCompanies = [
      'centcom',
      'sonance',
      'blaze',
      'iport',
      'danainnovations',
      'dana innovations',
      'james',
      'trufig'
    ]

    // Check if company contains any of the Centcom company names (case-insensitive)
    if (profile?.company) {
      const companyLower = profile.company.toLowerCase()
      const isCentcom = centcomCompanies.some(name => companyLower.includes(name))

      if (isCentcom) {
        console.log(`✅ Centcom brand detected for company: ${profile.company}`)
        return 'centcom'
      }
    }

    // Default to lyceum for all other cases
    console.log(`✅ Lyceum brand (default) for company: ${profile?.company || 'null'}`)
    return 'lyceum'

  } catch (error) {
    console.warn('Failed to get user brand type:', error)
    return 'lyceum' // Safe default
  }
}

// Helper: Get user's role from user_profiles
async function getUserRole(supabase: any, userId: string): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error) {
      console.warn('Failed to get user role:', error)
      return null
    }

    return profile?.role || null
  } catch (error) {
    console.warn('Failed to get user role:', error)
    return null
  }
}
