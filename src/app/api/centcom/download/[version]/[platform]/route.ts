import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  req: NextRequest,
  { params }: { params: { version: string; platform: string } }
) {
  try {
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
    const userLicense = await getUserLicenseType(supabase, userId)
    if (!userLicense) {
      return NextResponse.json({
        success: false,
        error: 'No valid license found'
      }, { status: 403 })
    }

    // Get version details
    const { data: version, error } = await supabase
      .from('application_versions')
      .select('*')
      .eq('application_name', 'centcom')
      .eq('version_number', params.version)
      .eq('platform', params.platform)
      .single()

    if (error || !version) {
      return NextResponse.json({
        success: false,
        error: 'Version not found'
      }, { status: 404 })
    }

    // Get download URL - either from download_url (GitHub) or generate signed URL (Supabase Storage)
    let downloadUrl = version.download_url
    let fileName = version.download_url ? version.download_url.split('/').pop() : null

    if (!downloadUrl && version.storage_path) {
      // Fallback to Supabase Storage signed URL
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('centcom-releases')
        .createSignedUrl(version.storage_path, 7200)

      if (urlError || !signedUrlData?.signedUrl) {
        return NextResponse.json({
          success: false,
          error: 'Failed to generate download URL'
        }, { status: 500 })
      }

      downloadUrl = signedUrlData.signedUrl
      fileName = version.storage_path.split('/').pop()
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
      version: params.version,
      platform: params.platform,
      installerType,
      licenseType: userLicense,
      ipAddress: req.headers.get('x-forwarded-for') || null,
      userAgent: req.headers.get('user-agent')
    })

    return NextResponse.json({
      success: true,
      download_id: downloadId,
      download_url: downloadUrl,
      file_name: fileName,
      file_size_bytes: version.file_size_bytes,
      sha256_hash: version.sha256_hash,
      expires_in: version.download_url ? null : 7200 // GitHub URLs don't expire, Supabase URLs expire in 2 hours
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
    // Get user email
    const { data: authUser } = await supabase.auth.admin.getUserById(userId)
    if (!authUser?.user) return null

    const email = authUser.user.email

    // Check Centcom licenses
    const { data: centcomLicenses } = await supabase
      .from('licenses')
      .select('license_type')
      .or(`user_id.eq.${userId},user_id.eq.${email}`)
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
    const priority: Record<string, number> = {
      'enterprise': 4,
      'professional': 3,
      'standard': 2,
      'trial': 1
    }

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
