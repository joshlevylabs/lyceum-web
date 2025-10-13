import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * Get group activity log
 * GET /api/groups/[id]/activity
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id: groupId } = await params
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Check if user is a member
    const { data: membership } = await dbOperations.supabaseAdmin
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get activity log
    const { data: activities, error: activityError } = await dbOperations.supabaseAdmin
      .from('group_activity_log')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (activityError) {
      console.error('Error fetching activity log:', activityError)
      return NextResponse.json(
        { error: 'Failed to fetch activity log' },
        { status: 500 }
      )
    }

    // Get user profiles for activity actors
    const userIds = [...new Set(activities?.map(a => a.user_id).filter(Boolean))] as string[]
    const { data: profiles } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, username')
      .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Enrich activities with user data
    const enrichedActivities = activities?.map(a => {
      const profile = a.user_id ? profileMap.get(a.user_id) : null
      return {
        id: a.id,
        action: a.action,
        details: a.details,
        created_at: a.created_at,
        user: profile ? {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          username: profile.username
        } : null
      }
    }) || []

    return NextResponse.json({
      success: true,
      activities: enrichedActivities,
      total: enrichedActivities.length,
      has_more: enrichedActivities.length === limit
    })

  } catch (error: any) {
    console.error('Error in GET /api/groups/[id]/activity:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}


