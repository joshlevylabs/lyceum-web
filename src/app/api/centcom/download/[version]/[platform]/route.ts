import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ version: string; platform: string }> }
) {
  try {
    // Await params in Next.js 15
    const { version, platform } = await params

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('user_id')
    const installerType = searchParams.get('installer_type') || 'exe'

    // Validate user_id is provided
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceKey)

    // Verify user has valid license
    console.log('🔍 Checking license for user:', userId)
    const userLicense = await getUserLicenseType(supabase, userId)
    console.log('📋 License lookup result:', userLicense)

    if (!userLicense) {
      console.error('❌ No license found for user:', userId)
      return NextResponse.json({
        success: false,
        error: 'No valid license found. Please contact support to activate your license.'
      }, { status: 403 })
    }

    console.log('✅ License verified:', userLicense)

    // Get user's brand type
    const brandType = await getUserBrandType(supabase, userId)
    console.log('✅ User brand type:', brandType)

    // Get version details - filter by installer_type AND brand_type
    console.log('🔍 Looking for version:', {
      app: 'centcom',
      version: version,
      platform: platform,
      installerType,
      brandType
    })

    const { data: versionData, error } = await supabase
      .from('application_versions')
      .select('*')
      .eq('application_name', 'centcom')
      .eq('version_number', version)
      .eq('platform', platform)
      .eq('installer_type', installerType)
      .eq('brand_type', brandType)
      .single()

    console.log('📦 Version query result:', { found: !!versionData, error: error?.message })

    if (error || !versionData) {
      console.error('❌ Version not found:', { error, version, platform, installerType })
      return NextResponse.json({
        success: false,
        error: `Version not found for ${platform} ${installerType} installer`
      }, { status: 404 })
    }

    console.log('✅ Version found:', {
      version: versionData.version_number,
      installer: versionData.installer_type,
      url: versionData.download_url
    })

    // Get download URL - either from download_url (GitHub) or generate signed URL (Supabase Storage)
    let downloadUrl = versionData.download_url
    let fileName = versionData.download_url ? versionData.download_url.split('/').pop() : null

    if (!downloadUrl && versionData.storage_path) {
      // Fallback to Supabase Storage signed URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('centcom-releases')
        .createSignedUrl(versionData.storage_path, 7200)

      if (urlError || !signedUrlData?.signedUrl) {
        return NextResponse.json({
          success: false,
          error: 'Failed to generate download URL'
        }, { status: 500 })
      }

      downloadUrl = signedUrlData.signedUrl
      fileName = versionData.storage_path.split('/').pop()
    }

    if (!downloadUrl) {
      return NextResponse.json({
        success: false,
        error: 'No download URL available'
      }, { status: 500 })
    }

    // Track download initiation
    const downloadId = await trackDownload(supabase, {
      userId,
      applicationName: 'centcom',
      version: version,
      platform: platform,
      installerType,
      brandType,
      licenseType: userLicense,
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      download_id: downloadId,
      download_url: downloadUrl,
      file_name: fileName,
      file_size_bytes: versionData.file_size_bytes,
      sha256_hash: versionData.sha256_hash,
      expires_in: versionData.download_url ? null : 7200 // GitHub URLs don't expire, Supabase URLs expire in 2 hours
    })

  } catch (error: any) {
    console.error('Download URL generation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

async function trackDownload(supabase: any, downloadData: any) {
  const { data, error } = await supabase
    .from('application_downloads')
    .insert({
      user_id: downloadData.userId,
      application_name: downloadData.applicationName,
      version: downloadData.version,
      platform: downloadData.platform,
      installer_type: downloadData.installerType,
      brand_type: downloadData.brandType,
      license_type: downloadData.licenseType,
      ip_address: downloadData.ipAddress,
      user_agent: downloadData.userAgent
    })
    .select('id')
    .single()

  return data?.id
}

async function getUserLicenseType(supabase: any, userId: string): Promise<string | null> {
  try {
    console.log('👤 Getting user info for:', userId)

    // Get user email
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(userId)
    console.log('📧 User lookup result:', { hasUser: !!authUser?.user, error: userError?.message })

    if (!authUser?.user) {
      console.error('❌ User not found in auth.users')
      return null
    }

    const email = authUser.user.email
    console.log('📧 User email:', email)

    // Check license_keys table (only table being used) - include both active and trial licenses
    console.log('🔍 Checking license_keys table...')
    const { data: licenses, error: licenseError } = await supabase
      .from('license_keys')
      .select('license_type, status, assigned_to')
      .eq('assigned_to', userId)
      .in('status', ['active', 'trial'])

    console.log('📋 License_keys table result:', {
      count: licenses?.length || 0,
      licenses: licenses,
      error: licenseError?.message
    })

    if (!licenses || licenses.length === 0) {
      console.error('❌ No active licenses found')
      return null
    }

    // License type priority
    const priority: Record<string, number> = {
      'enterprise': 4,
      'professional': 3,
      'standard': 2,
      'trial': 1
    }

    const bestLicense = licenses.reduce((best, current) => {
      const currentPriority = priority[current.license_type as keyof typeof priority] || 0
      const bestPriority = priority[best as keyof typeof priority] || 0
      return currentPriority > bestPriority ? current.license_type : best
    }, 'trial')

    console.log('✅ Best license found:', bestLicense)
    return bestLicense

  } catch (error) {
    console.error('❌ Exception in getUserLicenseType:', error)
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
