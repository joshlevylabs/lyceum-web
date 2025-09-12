import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/onboarding/progress - Get onboarding progress for all users or specific user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const licenseId = searchParams.get('license_id')
    const status = searchParams.get('status')

    // Check if onboarding_progress table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('onboarding_progress')
      .select('id')
      .limit(1)

    if (tableError && tableError.code === '42P01') {
      // Table doesn't exist, return helpful message
      return NextResponse.json({
        progress: [],
        error: 'Onboarding tables not set up yet',
        message: 'Please run the setup SQL script in your Supabase console first',
        setup_required: true
      })
    }

    let query = supabase
      .from('onboarding_progress')
      .select(`
        *,
        user_profiles!user_id (
          id,
          email,
          full_name,
          company
        ),
        licenses!license_id (
          id,
          license_type,
          plugin_id,
          status,
          expires_at
        ),
        license_keys!license_key_id (
          id,
          key_code,
          license_type,
          enabled_plugins
        )
      `)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (licenseId) {
      query = query.eq('license_id', licenseId)
    }

    if (status) {
      query = query.eq('overall_status', status)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich data with calculated fields
    const enrichedData = data?.map(progress => {
      const completionRate = progress.total_sessions_required > 0 
        ? (progress.sessions_completed / progress.total_sessions_required) * 100 
        : 0

      const isOverdue = progress.onboarding_deadline && 
        new Date() > new Date(progress.onboarding_deadline) &&
        progress.overall_status !== 'completed'

      return {
        ...progress,
        completion_rate: Math.round(completionRate),
        is_overdue: isOverdue,
        days_until_deadline: progress.onboarding_deadline 
          ? Math.ceil((new Date(progress.onboarding_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : null
      }
    })

    return NextResponse.json({ progress: enrichedData })

  } catch (error) {
    console.error('Error fetching onboarding progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/onboarding/progress - Create or update onboarding progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      license_id,
      license_key_id,
      total_sessions_required,
      plugin_sessions_required = {},
      onboarding_deadline
    } = body

    if (!user_id || (!license_id && !license_key_id)) {
      return NextResponse.json(
        { error: 'user_id and either license_id or license_key_id are required' },
        { status: 400 }
      )
    }

    // Check if progress record already exists
    let existingQuery = supabase
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user_id)

    if (license_id) {
      existingQuery = existingQuery.eq('license_id', license_id)
    } else if (license_key_id) {
      existingQuery = existingQuery.eq('license_key_id', license_key_id)
    }

    const { data: existing } = await existingQuery.single()

    const progressData = {
      user_id,
      license_id: license_id || null,
      license_key_id: license_key_id || null,
      total_sessions_required: total_sessions_required || 3,
      plugin_sessions_required,
      onboarding_deadline: onboarding_deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days default
      overall_status: existing?.overall_status || 'pending',
      updated_at: new Date().toISOString()
    }

    let result
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('onboarding_progress')
        .update(progressData)
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    } else {
      // Create new record
      const { data, error } = await supabase
        .from('onboarding_progress')
        .insert([progressData])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      result = data
    }

    return NextResponse.json({ progress: result })

  } catch (error) {
    console.error('Error creating/updating onboarding progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/onboarding/progress - Update progress status based on completed sessions
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { progress_id, user_id, license_id, license_key_id, session_completed = false } = body

    // Get current progress
    let query = supabase
      .from('onboarding_progress')
      .select('*')

    if (progress_id) {
      query = query.eq('id', progress_id)
    } else if (user_id && license_id) {
      query = query.eq('user_id', user_id).eq('license_id', license_id)
    } else if (user_id && license_key_id) {
      query = query.eq('user_id', user_id).eq('license_key_id', license_key_id)
    } else {
      return NextResponse.json(
        { error: 'Either progress_id or user_id with license_id/license_key_id is required' },
        { status: 400 }
      )
    }

    const { data: progress, error: fetchError } = await query.single()

    if (fetchError || !progress) {
      return NextResponse.json({ error: 'Progress record not found' }, { status: 404 })
    }

    // Calculate updated progress
    let updatedData: any = {
      updated_at: new Date().toISOString(),
      last_session_at: session_completed ? new Date().toISOString() : progress.last_session_at
    }

    if (session_completed) {
      updatedData.sessions_completed = (progress.sessions_completed || 0) + 1
    }

    // Determine new status
    const totalCompleted = updatedData.sessions_completed || progress.sessions_completed || 0
    const totalRequired = progress.total_sessions_required || 3

    if (totalCompleted >= totalRequired) {
      updatedData.overall_status = 'completed'
      updatedData.completed_at = new Date().toISOString()
      updatedData.license_active_status = true
    } else if (totalCompleted > 0) {
      updatedData.overall_status = 'in_progress'
    }

    // Check if overdue
    if (progress.onboarding_deadline && new Date() > new Date(progress.onboarding_deadline) && updatedData.overall_status !== 'completed') {
      updatedData.overall_status = 'overdue'
    }

    // Update the record
    const { data: updated, error: updateError } = await supabase
      .from('onboarding_progress')
      .update(updatedData)
      .eq('id', progress.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ progress: updated })

  } catch (error) {
    console.error('Error updating onboarding progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
