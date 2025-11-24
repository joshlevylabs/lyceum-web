import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/admin/versions/[id]/set-latest
 *
 * Set a version as the latest (enables auto_update, disables others)
 * Requires superadmin authentication
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15
    const { id } = await params

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

    const versionId = id

    // Get the version details
    const { data: version, error: versionError } = await supabase
      .from('application_versions')
      .select('*')
      .eq('id', versionId)
      .single()

    if (versionError || !version) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    console.log(`📦 Setting version ${version.version_number} (${version.brand_type} ${version.installer_type}) as latest`)

    // Disable auto_update for all other versions with the same brand/platform/installer_type
    const { error: disableError } = await supabase
      .from('application_versions')
      .update({ auto_update_enabled: false })
      .eq('application_name', version.application_name)
      .eq('platform', version.platform)
      .eq('brand_type', version.brand_type)
      .eq('installer_type', version.installer_type)
      .neq('id', versionId) // Don't disable the version we're about to enable

    if (disableError) {
      console.error('Error disabling old versions:', disableError)
      // Don't fail - continue with enabling the new version
    }

    // Enable auto_update for this version
    const { data: updatedVersion, error: enableError } = await supabase
      .from('application_versions')
      .update({ auto_update_enabled: true })
      .eq('id', versionId)
      .select()
      .single()

    if (enableError) {
      console.error('Error enabling version:', enableError)
      return NextResponse.json(
        { error: 'Failed to set version as latest', details: enableError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully set version ${version.version_number} as latest`)

    return NextResponse.json({
      success: true,
      message: `Version ${version.version_number} (${version.brand_type} ${version.installer_type}) is now the latest`,
      version: updatedVersion
    })

  } catch (error) {
    console.error('Error in POST /api/admin/versions/[id]/set-latest:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
