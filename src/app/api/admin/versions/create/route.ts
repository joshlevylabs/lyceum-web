import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/versions/create
 *
 * Manually create a version record (for testing/mock purposes)
 * Requires superadmin authentication
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Verify user is superadmin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || userProfile?.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Unauthorized: Superadmin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      version_number,
      brand_type,
      installer_type,
      platform = 'windows',
      download_url,
      release_stage = 'unreleased',
      file_size_bytes,
      sha256_hash,
      changelog_url,
      release_notes
    } = body

    // Validate required fields
    if (!version_number || !brand_type || !installer_type || !download_url) {
      return NextResponse.json(
        { error: 'Missing required fields: version_number, brand_type, installer_type, download_url' },
        { status: 400 }
      )
    }

    // Validate brand_type
    if (!['centcom', 'lyceum'].includes(brand_type)) {
      return NextResponse.json(
        { error: 'Invalid brand_type. Must be "centcom" or "lyceum"' },
        { status: 400 }
      )
    }

    // Validate installer_type
    if (!['exe', 'msi'].includes(installer_type)) {
      return NextResponse.json(
        { error: 'Invalid installer_type. Must be "exe" or "msi"' },
        { status: 400 }
      )
    }

    // Validate release_stage
    if (!['unreleased', 'testing', 'production'].includes(release_stage)) {
      return NextResponse.json(
        { error: 'Invalid release_stage. Must be "unreleased", "testing", or "production"' },
        { status: 400 }
      )
    }

    console.log(`📦 Manually creating version ${version_number} (${brand_type} ${installer_type})`)

    // Check if version already exists
    const { data: existingVersion } = await supabase
      .from('application_versions')
      .select('id')
      .eq('version_number', version_number)
      .eq('brand_type', brand_type)
      .eq('installer_type', installer_type)
      .eq('platform', platform)
      .single()

    if (existingVersion) {
      return NextResponse.json(
        { error: `Version ${version_number} (${brand_type} ${installer_type}) already exists` },
        { status: 409 }
      )
    }

    // Create version record
    const versionRecord = {
      application_name: 'centcom',
      version_number,
      platform,
      brand_type,
      installer_type,
      is_stable: true,
      is_supported: true,
      auto_update_enabled: release_stage === 'production', // Only enable auto-update for production
      release_stage,
      release_date: new Date().toISOString(),
      download_url,
      storage_path: null,
      file_size_bytes: file_size_bytes || null,
      sha256_hash: sha256_hash || null,
      changelog_url: changelog_url || null,
      breaking_changes: release_notes || null
    }

    const { data: insertedVersion, error: insertError } = await supabase
      .from('application_versions')
      .insert(versionRecord)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Error creating version:', insertError)
      return NextResponse.json(
        { error: 'Failed to create version', details: insertError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully created version ${version_number}`)

    return NextResponse.json({
      success: true,
      message: `Version ${version_number} created successfully`,
      version: insertedVersion
    })

  } catch (error) {
    console.error('❌ Error in POST /api/admin/versions/create:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
