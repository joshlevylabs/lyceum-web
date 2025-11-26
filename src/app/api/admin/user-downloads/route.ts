import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import * as dbOperations from '@/lib/supabase-direct'

/**
 * GET /api/admin/user-downloads?userId=xxx
 * Get download statistics for a specific user (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const { data: profile } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get userId from query params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 })
    }

    // Get download count
    const { data: downloads, error: downloadsError } = await dbOperations.supabaseAdmin
      .from('application_downloads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (downloadsError) {
      console.error('Error fetching downloads:', downloadsError)
      return NextResponse.json(
        { error: 'Failed to fetch downloads' },
        { status: 500 }
      )
    }

    // Get download statistics
    const totalDownloads = downloads?.length || 0
    const platformBreakdown = downloads?.reduce((acc: any, download: any) => {
      acc[download.platform] = (acc[download.platform] || 0) + 1
      return acc
    }, {})

    const mostRecentDownload = downloads?.[0]

    return NextResponse.json({
      success: true,
      totalDownloads,
      platformBreakdown,
      mostRecentDownload: mostRecentDownload ? {
        version: mostRecentDownload.version,
        platform: mostRecentDownload.platform,
        createdAt: mostRecentDownload.created_at,
        installerType: mostRecentDownload.installer_type
      } : null,
      downloads: downloads?.slice(0, 10) // Return last 10 downloads
    })

  } catch (error: any) {
    console.error('Error in user-downloads API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
