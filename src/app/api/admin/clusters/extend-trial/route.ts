import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { dbOperations } from '@/lib/supabase-direct';

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user and check for admin role
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;
    
    // Check if user is admin (superuser can extend trials)
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clusterId, extensionDays } = body;

    // Validate required fields
    if (!clusterId || !extensionDays) {
      return NextResponse.json(
        { error: 'clusterId and extensionDays are required' },
        { status: 400 }
      );
    }

    // Validate extension days
    if (extensionDays < 1 || extensionDays > 365) {
      return NextResponse.json(
        { error: 'Extension days must be between 1 and 365' },
        { status: 400 }
      );
    }

    // Check if cluster exists
    const { data: cluster, error: clusterError } = await dbOperations.supabaseAdmin
      .from('database_clusters')
      .select('id, name, pricing_model, trial_length_days')
      .eq('id', clusterId)
      .single();

    if (clusterError || !cluster) {
      return NextResponse.json(
        { error: 'Cluster not found' },
        { status: 404 }
      );
    }

    // Check if cluster is actually a trial cluster
    if (cluster.pricing_model !== 'trial') {
      return NextResponse.json(
        { error: 'Only trial clusters can have their trial period extended' },
        { status: 400 }
      );
    }

    // Try to extend trial for all active assignments on this cluster
    try {
      // First, check if we have cluster_user_assignments table (enhanced features)
      const { data: assignments, error: assignmentError } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .select('id, assigned_at, expires_at, user_id')
        .eq('cluster_id', clusterId)
        .eq('is_active', true);

      if (!assignmentError && assignments && assignments.length > 0) {
        // Update all active assignments to extend their trial
        const updatePromises = assignments.map(assignment => {
          const currentExpiration = assignment.expires_at 
            ? new Date(assignment.expires_at)
            : new Date(new Date(assignment.assigned_at).getTime() + (cluster.trial_length_days || 30) * 24 * 60 * 60 * 1000);
          
          const newExpiration = new Date(currentExpiration.getTime() + extensionDays * 24 * 60 * 60 * 1000);

          return dbOperations.supabaseAdmin
            .from('cluster_user_assignments')
            .update({
              expires_at: newExpiration.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', assignment.id);
        });

        const updateResults = await Promise.all(updatePromises);
        const failedUpdates = updateResults.filter(result => result.error);

        if (failedUpdates.length > 0) {
          console.error('Some assignment updates failed:', failedUpdates);
          return NextResponse.json(
            { error: 'Failed to extend trial for some users' },
            { status: 500 }
          );
        }

        // Log the trial extension activity
        try {
          await dbOperations.supabaseAdmin
            .from('cluster_audit_log')
            .insert({
              cluster_id: clusterId,
              user_id: user.id,
              action: 'trial_extended',
              details: {
                extension_days: extensionDays,
                affected_users: assignments.length,
                extended_by: user.email
              },
              timestamp: new Date().toISOString()
            });
        } catch (auditError) {
          console.log('Audit logging failed (table may not exist):', auditError);
        }

        return NextResponse.json({
          success: true,
          message: `Trial period extended by ${extensionDays} days for ${assignments.length} users`,
          data: {
            cluster_id: clusterId,
            extension_days: extensionDays,
            affected_users: assignments.length,
            extended_by: user.email,
            extended_at: new Date().toISOString()
          }
        });

      } else {
        // Enhanced features not available, extend trial length for the cluster itself
        const newTrialLength = (cluster.trial_length_days || 30) + extensionDays;

        const { error: updateError } = await dbOperations.supabaseAdmin
          .from('database_clusters')
          .update({
            trial_length_days: newTrialLength,
            updated_at: new Date().toISOString()
          })
          .eq('id', clusterId);

        if (updateError) {
          console.error('Failed to update cluster trial length:', updateError);
          return NextResponse.json(
            { error: 'Failed to extend trial period' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: `Cluster trial period extended by ${extensionDays} days`,
          data: {
            cluster_id: clusterId,
            extension_days: extensionDays,
            new_trial_length: newTrialLength,
            extended_by: user.email,
            extended_at: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error('Error extending trial:', error);
      return NextResponse.json(
        { error: 'Failed to extend trial period' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in trial extension endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
