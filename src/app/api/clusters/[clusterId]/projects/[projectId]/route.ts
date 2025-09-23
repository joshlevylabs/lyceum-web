import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

interface ProjectUpdate {
  name?: string
  description?: string
  data_sources?: Array<{
    name: string
    table_name: string
    schema: Record<string, string>
  }>
  configuration?: Record<string, any>
  status?: 'active' | 'archived' | 'deleted'
}

// GET /api/clusters/[clusterId]/projects/[projectId] - Get project details
export async function GET(
  request: NextRequest,
  { params }: { params: { clusterId: string; projectId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId, projectId } = params

    // Check if user has access to this cluster
    const { data: hasAccess } = await supabase
      .rpc('check_cluster_permission', {
        user_uuid: user.id,
        cluster_uuid: clusterId,
        required_permission: 'data_read'
      })

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get project with all related data
    const { data: project, error } = await supabase
      .from('cluster_projects')
      .select(`
        *,
        cluster:cluster_id (
          id,
          name,
          status,
          clickhouse_cluster_id
        ),
        creator:created_by (
          id,
          email,
          raw_user_meta_data
        ),
        project_assets (
          id,
          name,
          asset_type,
          configuration,
          max_curves,
          optimization_level,
          created_at,
          updated_at,
          creator:created_by (
            id,
            email,
            raw_user_meta_data
          )
        )
      `)
      .eq('id', projectId)
      .eq('cluster_id', clusterId)
      .single()

    if (error || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Format response
    const response = {
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        project_type: project.project_type,
        status: project.status,
        created_at: project.created_at,
        updated_at: project.updated_at,
        
        // Cluster information
        cluster: {
          id: project.cluster.id,
          name: project.cluster.name,
          status: project.cluster.status,
          clickhouse_cluster_id: project.cluster.clickhouse_cluster_id
        },
        
        // Creator information
        created_by: {
          id: project.creator.id,
          email: project.creator.email,
          full_name: project.creator.raw_user_meta_data?.full_name || project.creator.email.split('@')[0]
        },
        
        // Data sources configuration
        data_sources: project.data_sources || [],
        table_schemas: project.table_schemas || {},
        configuration: project.configuration || {},
        
        // Assets in this project
        assets: project.project_assets?.map((asset: any) => ({
          id: asset.id,
          name: asset.name,
          asset_type: asset.asset_type,
          configuration: asset.configuration || {},
          max_curves: asset.max_curves,
          optimization_level: asset.optimization_level,
          created_at: asset.created_at,
          updated_at: asset.updated_at,
          created_by: {
            id: asset.creator.id,
            email: asset.creator.email,
            full_name: asset.creator.raw_user_meta_data?.full_name || asset.creator.email.split('@')[0]
          }
        })) || [],
        
        // Summary statistics
        summary: {
          data_sources_count: project.data_sources?.length || 0,
          assets_count: project.project_assets?.length || 0,
          dashboard_count: project.project_assets?.filter((a: any) => a.asset_type === 'dashboard').length || 0,
          chart_count: project.project_assets?.filter((a: any) => a.asset_type === 'chart').length || 0,
          report_count: project.project_assets?.filter((a: any) => a.asset_type === 'report').length || 0,
          alert_count: project.project_assets?.filter((a: any) => a.asset_type === 'alert').length || 0
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in GET /api/clusters/[clusterId]/projects/[projectId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/clusters/[clusterId]/projects/[projectId] - Update project
export async function PATCH(
  request: NextRequest,
  { params }: { params: { clusterId: string; projectId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId, projectId } = params
    const body: ProjectUpdate = await request.json()

    // Check if user has permission to modify projects
    const { data: hasPermission } = await supabase
      .rpc('check_cluster_permission', {
        user_uuid: user.id,
        cluster_uuid: clusterId,
        required_permission: 'data_write'
      })

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions to modify projects' }, { status: 403 })
    }

    // Verify project exists and belongs to cluster
    const { data: existingProject } = await supabase
      .from('cluster_projects')
      .select('created_by, name')
      .eq('id', projectId)
      .eq('cluster_id', clusterId)
      .single()

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if name conflicts with another project (if name is being changed)
    if (body.name && body.name !== existingProject.name) {
      const { data: conflictProject } = await supabase
        .from('cluster_projects')
        .select('id')
        .eq('cluster_id', clusterId)
        .eq('name', body.name)
        .eq('status', 'active')
        .neq('id', projectId)
        .single()

      if (conflictProject) {
        return NextResponse.json({ 
          error: 'Another active project with this name already exists in cluster' 
        }, { status: 400 })
      }
    }

    // Build update object
    const updateData: any = {}
    
    if (body.name) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.data_sources) updateData.data_sources = body.data_sources
    if (body.configuration) updateData.configuration = body.configuration
    if (body.status) updateData.status = body.status

    // Update project
    const { data: updatedProject, error: updateError } = await supabase
      .from('cluster_projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('cluster_id', clusterId)
      .select(`
        *,
        creator:created_by (
          id,
          email,
          raw_user_meta_data
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating project:', updateError)
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
    }

    // TODO: Update ClickHouse tables if data sources changed
    // if (body.data_sources) {
    //   await updateClickHouseTables(clusterId, projectId, body.data_sources)
    // }

    return NextResponse.json({
      success: true,
      project: {
        id: updatedProject.id,
        name: updatedProject.name,
        description: updatedProject.description,
        project_type: updatedProject.project_type,
        status: updatedProject.status,
        updated_at: updatedProject.updated_at,
        data_sources: updatedProject.data_sources || [],
        configuration: updatedProject.configuration || {},
        created_by: {
          id: updatedProject.creator.id,
          email: updatedProject.creator.email,
          full_name: updatedProject.creator.raw_user_meta_data?.full_name || updatedProject.creator.email.split('@')[0]
        }
      }
    })

  } catch (error) {
    console.error('Error in PATCH /api/clusters/[clusterId]/projects/[projectId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/clusters/[clusterId]/projects/[projectId] - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { clusterId: string; projectId: string } }
) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { clusterId, projectId } = params
    const url = new URL(request.url)
    const hard_delete = url.searchParams.get('hard_delete') === 'true'

    // Check if user has permission to delete projects (or is project creator)
    const { data: project } = await supabase
      .from('cluster_projects')
      .select('created_by, name, status')
      .eq('id', projectId)
      .eq('cluster_id', clusterId)
      .single()

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check permissions - user can delete their own projects, or admins can delete any
    const canDelete = project.created_by === user.id
    
    if (!canDelete) {
      const { data: hasAdmin } = await supabase
        .rpc('check_cluster_permission', {
          user_uuid: user.id,
          cluster_uuid: clusterId,
          required_permission: 'cluster_management'
        })
      
      if (!hasAdmin) {
        return NextResponse.json({ error: 'Insufficient permissions to delete this project' }, { status: 403 })
      }
    }

    if (hard_delete) {
      // Hard delete - actually remove from database
      const { error: deleteError } = await supabase
        .from('cluster_projects')
        .delete()
        .eq('id', projectId)
        .eq('cluster_id', clusterId)

      if (deleteError) {
        console.error('Error deleting project:', deleteError)
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
      }

      // TODO: Drop ClickHouse tables associated with project
      // await dropClickHouseTables(clusterId, projectId)

      return NextResponse.json({
        success: true,
        message: 'Project permanently deleted'
      })

    } else {
      // Soft delete - mark as deleted
      const { error: updateError } = await supabase
        .from('cluster_projects')
        .update({ status: 'deleted' })
        .eq('id', projectId)
        .eq('cluster_id', clusterId)

      if (updateError) {
        console.error('Error marking project as deleted:', updateError)
        return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Project marked as deleted (can be restored)',
        restore_note: 'Use PATCH with status: "active" to restore this project'
      })
    }

  } catch (error) {
    console.error('Error in DELETE /api/clusters/[clusterId]/projects/[projectId]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
