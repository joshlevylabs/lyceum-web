import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type ReleaseStage = 'unreleased' | 'testing' | 'production'

/**
 * POST /api/admin/versions/[id]/set-stage
 *
 * Change the release stage of a version (unreleased → testing → production)
 * Requires superadmin authentication
 *
 * Rules:
 * - Only one version per brand/installer_type can be in testing
 * - Only one version per brand/installer_type can be in production
 * - When promoting to testing/production, previous versions in that stage are demoted to unreleased
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
    const { release_stage } = body

    // Validate release_stage
    const validStages: ReleaseStage[] = ['unreleased', 'testing', 'production']
    if (!release_stage || !validStages.includes(release_stage)) {
      return NextResponse.json(
        { error: 'Invalid release_stage. Must be "unreleased", "testing", or "production"' },
        { status: 400 }
      )
    }

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

    console.log(`🔄 Changing ${version.version_number} (${version.brand_type} ${version.installer_type}) from ${version.release_stage} → ${release_stage}`)

    // If promoting to testing or production, demote other versions in that stage
    if (release_stage === 'testing' || release_stage === 'production') {
      console.log(`   Demoting other ${release_stage} versions for ${version.brand_type} ${version.installer_type}...`)

      const { error: demoteError } = await supabase
        .from('application_versions')
        .update({
          release_stage: 'unreleased',
          auto_update_enabled: false // Also disable auto-update
        })
        .eq('application_name', version.application_name)
        .eq('platform', version.platform)
        .eq('brand_type', version.brand_type)
        .eq('installer_type', version.installer_type)
        .eq('release_stage', release_stage)
        .neq('id', versionId) // Don't demote the version we're promoting

      if (demoteError) {
        console.error('   ⚠️  Warning: Error demoting old versions:', demoteError)
        // Don't fail - continue with promotion
      } else {
        console.log(`   ✅ Demoted previous ${release_stage} versions`)
      }
    }

    // Update the version's release stage
    // If promoting to production, also enable auto_update
    const updateData: any = {
      release_stage: release_stage
    }

    if (release_stage === 'production') {
      updateData.auto_update_enabled = true
      console.log(`   🚀 Enabling auto-update for production release`)
    } else {
      updateData.auto_update_enabled = false
      console.log(`   🔒 Disabling auto-update for ${release_stage} release`)
    }

    const { data: updatedVersion, error: updateError } = await supabase
      .from('application_versions')
      .update(updateData)
      .eq('id', versionId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Error updating version:', updateError)
      return NextResponse.json(
        { error: 'Failed to update release stage', details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully changed release stage to ${release_stage}`)

    // Build stage name for response
    const stageNames = {
      'unreleased': 'Unreleased',
      'testing': 'Testing',
      'production': 'Production'
    }

    return NextResponse.json({
      success: true,
      message: `Version ${version.version_number} (${version.brand_type} ${version.installer_type}) is now ${stageNames[release_stage]}`,
      version: updatedVersion,
      release_stage: release_stage
    })

  } catch (error) {
    console.error('❌ Error in POST /api/admin/versions/[id]/set-stage:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
