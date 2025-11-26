import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * PUT /api/admin/versions/[id]
 *
 * Update version details (e.g., download_url)
 * Requires superadmin authentication
 */
export async function PUT(
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

    // Verify user is admin or superadmin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || (userProfile?.role !== 'admin' && userProfile?.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      )
    }

    const versionId = id
    const body = await request.json()
    const { download_url } = body

    // Validate input
    if (!download_url) {
      return NextResponse.json(
        { error: 'Missing required field: download_url' },
        { status: 400 }
      )
    }

    // Validate URL format
    try {
      new URL(download_url)
    } catch {
      return NextResponse.json(
        { error: 'Invalid download_url format' },
        { status: 400 }
      )
    }

    // Update the version
    const { data: updatedVersion, error: updateError } = await supabase
      .from('application_versions')
      .update({ download_url })
      .eq('id', versionId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating version:', updateError)
      return NextResponse.json(
        { error: 'Failed to update version', details: updateError.message },
        { status: 500 }
      )
    }

    if (!updatedVersion) {
      return NextResponse.json(
        { error: 'Version not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Updated version ${updatedVersion.version_number} download URL`)

    return NextResponse.json({
      success: true,
      message: 'Version updated successfully',
      version: updatedVersion
    })

  } catch (error) {
    console.error('Error in PUT /api/admin/versions/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
