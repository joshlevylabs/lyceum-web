import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { supabaseAdmin } from '@/lib/supabase-direct'

export async function GET(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectType = searchParams.get('project_type') || 'test_data'
    const clusterId = searchParams.get('cluster_id')
    const syncStatus = searchParams.get('sync_status')

    // Query cluster_projects table directly with related cluster information
    let query = supabaseAdmin
      .from('cluster_projects')
      .select(`
        *,
        clusters:cluster_id (
          name,
          cluster_type,
          architecture
        )
      `)
      .eq('owner_id', user.id)

    // Apply filters
    if (projectType) {
      query = query.eq('project_type', projectType)
    }

    if (clusterId) {
      query = query.eq('cluster_id', clusterId)
    }

    if (syncStatus) {
      query = query.eq('sync_status', syncStatus)
    }

    // Order by most recently synced
    query = query.order('last_synced_at', { ascending: false, nullsFirst: false })

    const { data: rawProjects, error } = await query

    if (error) {
      console.error('Error fetching cluster projects:', error)
      return NextResponse.json({ error: 'Failed to fetch cluster projects' }, { status: 500 })
    }

    // Transform the data to flatten the cluster information
    const projects = rawProjects?.map((project: any) => ({
      ...project,
      cluster_name: project.clusters?.name || 'Unknown',
      cluster_type: project.clusters?.cluster_type || project.clusters?.architecture === 'centcom' ? 'local' : 'cloud',
      measurement_count: project.metadata?.measurement_count || 0,
      file_count: project.metadata?.file_count || 0
    })) || []

    // Get summary statistics
    const stats = {
      total_projects: projects.length,
      total_measurements: projects.reduce((sum: number, p: any) => sum + (p.measurement_count || 0), 0),
      total_files: projects.reduce((sum: number, p: any) => sum + (p.file_count || 0), 0),
      by_cluster_type: {
        local: projects.filter((p: any) => p.cluster_type === 'local').length,
        cloud: projects.filter((p: any) => p.cluster_type === 'cloud').length
      },
      by_sync_status: {
        synced: projects.filter((p: any) => p.sync_status === 'synced').length,
        pending: projects.filter((p: any) => p.sync_status === 'pending').length,
        error: projects.filter((p: any) => p.sync_status === 'error').length,
        disabled: projects.filter((p: any) => p.sync_status === 'disabled').length
      }
    }

    return NextResponse.json({
      success: true,
      projects,
      stats
    })

  } catch (error: any) {
    console.error('Cluster projects API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cluster projects', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/cluster-projects
 * Trigger a sync for a specific cluster project or all projects
 */
export async function POST(request: NextRequest) {
  try {
    const { success, user, response } = await requireAuth(request)
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { projectId, clusterId, action } = await request.json()

    if (action === 'sync') {
      // Update sync status to pending for the specified project(s)
      let updateQuery = supabaseAdmin
        .from('cluster_projects')
        .update({
          sync_status: 'pending',
          last_synced_at: new Date().toISOString()
        })
        .eq('owner_id', user.id)
        .eq('project_type', 'test_data')

      if (projectId) {
        updateQuery = updateQuery.eq('id', projectId)
      } else if (clusterId) {
        updateQuery = updateQuery.eq('cluster_id', clusterId)
      }

      const { data, error } = await updateQuery.select()

      if (error) {
        console.error('Error triggering sync:', error)
        return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Sync triggered successfully',
        projects_affected: data?.length || 0
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error: any) {
    console.error('Cluster projects sync API error:', error)
    return NextResponse.json(
      { error: 'Failed to process sync request', details: error.message },
      { status: 500 }
    )
  }
}
