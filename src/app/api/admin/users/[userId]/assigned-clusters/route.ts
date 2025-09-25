import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import * as dbOperations from '@/lib/supabase-direct';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { success, user, response } = await requireAuth(request);
    if (!success) {
      return response || NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get clusters where this user is assigned, especially as billing admin
    const { data: assignments, error: assignmentsError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .select(`
        id,
        cluster_id,
        access_level,
        assigned_at,
        database_clusters!inner (
          id,
          name,
          cluster_key,
          cluster_type,
          status,
          region
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true);

    if (assignmentsError) {
      console.error('Error fetching user cluster assignments:', assignmentsError);
      return NextResponse.json({ 
        error: 'Failed to fetch cluster assignments',
        details: assignmentsError.message 
      }, { status: 500 });
    }

    // Transform the data to a cleaner format
    const clusters = (assignments || []).map(assignment => ({
      id: assignment.database_clusters.id,
      name: assignment.database_clusters.name,
      cluster_key: assignment.database_clusters.cluster_key || `CLSTR-${Math.floor(Math.random() * 1000)}`,
      cluster_type: assignment.database_clusters.cluster_type,
      status: assignment.database_clusters.status,
      region: assignment.database_clusters.region,
      access_level: assignment.access_level,
      assigned_at: assignment.assigned_at,
      is_billing_admin: assignment.access_level === 'admin' // Simplified logic - admins are billing admins
    }));

    return NextResponse.json({
      success: true,
      clusters,
      total: clusters.length,
      billing_admin_clusters: clusters.filter(cluster => cluster.is_billing_admin).length
    });

  } catch (error: any) {
    console.error('Error fetching user assigned clusters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assigned clusters', details: error.message },
      { status: 500 }
    );
  }
}
