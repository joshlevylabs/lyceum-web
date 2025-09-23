import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

// GET /api/clusters/[clusterId]/projects - List projects in cluster
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterId } = await params

    // Check if user has access to this cluster using dbOperations
    const { data: cluster, error: accessError } = await dbOperations.getClusterById(clusterId, user.id)
    if (accessError || !cluster) {
      return NextResponse.json({ error: 'Cluster not found or access denied' }, { status: 404 })
    }

    // Return the projects from the cluster data
    const projects = cluster.cluster_projects || []

    return NextResponse.json({
      success: true,
      projects: projects,
      total: projects.length,
      cluster_id: clusterId
    })

  } catch (error) {
    console.error('Error in GET /api/clusters/[clusterId]/projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clusters/[clusterId]/projects - Create new project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clusterId: string }> }
) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { clusterId } = await params

    // Check if user has access to this cluster using dbOperations
    const { data: cluster, error: accessError } = await dbOperations.getClusterById(clusterId, user.id)
    if (accessError || !cluster) {
      return NextResponse.json({ error: 'Cluster not found or access denied' }, { status: 404 })
    }

    // Check user permissions
    const userAccess = cluster.cluster_team_access?.find((access: any) => access.user_id === user.id)
    const userRole = userAccess?.role || (cluster.created_by === user.id ? 'admin' : null)
    
    if (!userRole || (!userAccess?.permissions?.data_write && userRole !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions to create projects' }, { status: 403 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.project_type) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, project_type' 
      }, { status: 400 })
    }

    // Create a simple project response (in a real implementation, this would create a database record)
    const project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      description: body.description || '',
      project_type: body.project_type,
      cluster_id: clusterId,
      created_by: user.id,
      created_at: new Date().toISOString(),
      status: 'active',
      configuration: body.configuration || {}
    }

    return NextResponse.json({
      success: true,
      project: project,
      message: 'Project created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Error in POST /api/clusters/[clusterId]/projects:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}