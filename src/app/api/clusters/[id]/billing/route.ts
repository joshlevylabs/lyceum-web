import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

// POST /api/clusters/id/[id]/billing - Update billing settings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse

    const { id } = await params
    const { responsible_user_id, estimated_monthly_cost, billing_notes } = await request.json()

    if (!responsible_user_id) {
      return NextResponse.json({ error: 'responsible_user_id is required' }, { status: 400 })
    }

    // Check if current user has admin access
    const { data: adminAccess, error: accessError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select('access_level')
      .eq('cluster_id', id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (accessError || !adminAccess || !['owner', 'admin'].includes(adminAccess.access_level)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update cluster billing information
    const updateData: any = {
      responsible_user_id,
      updated_at: new Date().toISOString()
    }

    if (estimated_monthly_cost !== undefined) {
      updateData.estimated_monthly_cost = estimated_monthly_cost
    }

    const { data: updatedCluster, error: updateError } = await dbOperations.supabaseAdmin
      .from('unified_clusters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating cluster billing:', updateError)
      return NextResponse.json({ error: 'Failed to update billing settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Billing settings updated successfully',
      cluster: updatedCluster
    })

  } catch (error) {
    console.error('Error in POST /api/clusters/id/[id]/billing:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}



