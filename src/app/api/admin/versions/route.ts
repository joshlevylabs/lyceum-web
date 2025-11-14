import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/admin/versions
 *
 * List all application versions
 * Requires superadmin authentication
 */
export async function GET(request: NextRequest) {
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

    // Fetch all versions
    const { data: versions, error: versionsError } = await supabase
      .from('application_versions')
      .select('*')
      .order('release_date', { ascending: false })
      .order('brand_type', { ascending: true })
      .order('installer_type', { ascending: true })

    if (versionsError) {
      console.error('Error fetching versions:', versionsError)
      return NextResponse.json(
        { error: 'Failed to fetch versions', details: versionsError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      versions: versions || []
    })

  } catch (error) {
    console.error('Error in GET /api/admin/versions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
