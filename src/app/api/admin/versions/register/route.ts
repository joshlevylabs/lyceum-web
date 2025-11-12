import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/versions/register
 *
 * Automatically register a new version when GitHub release is published
 * Called by GitHub Actions workflow
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const apiKey = authHeader.substring(7)

    // Verify API key matches admin key from environment
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      version,
      brand_type,
      platform = 'windows',
      github_release_url,
      release_tag
    } = body

    // Validate required fields
    if (!version || !brand_type || !release_tag) {
      return NextResponse.json(
        { error: 'Missing required fields: version, brand_type, release_tag' },
        { status: 400 }
      )
    }

    if (!['centcom', 'lyceum'].includes(brand_type)) {
      return NextResponse.json(
        { error: 'Invalid brand_type. Must be "centcom" or "lyceum"' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Determine repository and filenames based on brand
    const repoName = brand_type === 'centcom' ? 'centcom-releases' : 'lyceum-releases'
    const appName = brand_type === 'centcom' ? 'Centcom' : 'Lyceum'

    // Construct download URLs for both installer types
    // Actual naming pattern: Lyceum_1.0.1_x64-setup.exe and Lyceum_1.0.1_x64_en-US.msi
    const exeUrl = `https://github.com/joshlevylabs/${repoName}/releases/download/${release_tag}/${appName}_${version}_x64-setup.exe`
    const msiUrl = `https://github.com/joshlevylabs/${repoName}/releases/download/${release_tag}/${appName}_${version}_x64_en-US.msi`

    console.log(`📦 Registering version ${version} for ${brand_type}`)
    console.log(`   EXE: ${exeUrl}`)
    console.log(`   MSI: ${msiUrl}`)

    // First, disable auto_update for all previous versions of this brand
    const { error: updateError } = await supabase
      .from('application_versions')
      .update({ auto_update_enabled: false })
      .eq('application_name', 'centcom')
      .eq('platform', platform)
      .eq('brand_type', brand_type)
      .eq('auto_update_enabled', true)

    if (updateError) {
      console.error('Error disabling old versions:', updateError)
      // Don't fail - continue with insertion
    }

    // Insert new version records (both exe and msi)
    // Only using columns that exist in the application_versions table
    const versionRecords = [
      {
        application_name: 'centcom',
        version_number: version,
        platform: platform,
        brand_type: brand_type,
        installer_type: 'exe',
        is_stable: true,
        is_supported: true,
        auto_update_enabled: true,
        release_date: new Date().toISOString(),
        download_url: exeUrl,
        storage_path: null
      },
      {
        application_name: 'centcom',
        version_number: version,
        platform: platform,
        brand_type: brand_type,
        installer_type: 'msi',
        is_stable: true,
        is_supported: true,
        auto_update_enabled: true,
        release_date: new Date().toISOString(),
        download_url: msiUrl,
        storage_path: null
      }
    ]

    const { data: insertedVersions, error: insertError } = await supabase
      .from('application_versions')
      .insert(versionRecords)
      .select()

    if (insertError) {
      console.error('❌ Error inserting version records:', insertError)
      return NextResponse.json(
        { error: 'Failed to register version', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully registered ${insertedVersions?.length} version records`)

    return NextResponse.json({
      success: true,
      message: `Version ${version} registered successfully for ${brand_type}`,
      versions_created: insertedVersions?.length || 0,
      version_details: {
        version: version,
        brand: brand_type,
        platform: platform,
        exe_url: exeUrl,
        msi_url: msiUrl
      }
    })

  } catch (error) {
    console.error('❌ Version registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
