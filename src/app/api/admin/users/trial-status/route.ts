import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { dbOperations } from '@/lib/supabase-direct';

export async function GET(request: NextRequest) {
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
    
    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: userProfile, error: userError } = await dbOperations.supabaseAdmin
      .from('user_profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has any active trial clusters
    let hasActiveTrial = false;
    let trialDetails: any = {};
    let trialClusters: any[] = [];

    try {
      // Check cluster assignments for trial clusters
      const { data: assignments, error: assignmentError } = await dbOperations.supabaseAdmin
        .from('cluster_user_assignments')
        .select(`
          id,
          assigned_at,
          expires_at,
          is_active,
          database_clusters (
            id,
            name,
            cluster_key,
            pricing_model,
            trial_length_days,
            created_at
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (!assignmentError && assignments) {
        // Filter for trial clusters
        const activeTrialAssignments = assignments.filter(assignment => 
          assignment.database_clusters && 
          assignment.database_clusters.pricing_model === 'trial'
        );

        if (activeTrialAssignments.length > 0) {
          hasActiveTrial = true;
          trialClusters = activeTrialAssignments.map(assignment => ({
            cluster_id: assignment.database_clusters.id,
            cluster_name: assignment.database_clusters.name,
            cluster_key: assignment.database_clusters.cluster_key,
            assigned_at: assignment.assigned_at,
            expires_at: assignment.expires_at,
            trial_length_days: assignment.database_clusters.trial_length_days,
            cluster_created_at: assignment.database_clusters.created_at
          }));

          // Calculate trial expiration based on assignment date and trial length
          const firstTrial = activeTrialAssignments[0];
          if (firstTrial.database_clusters) {
            const assignedDate = new Date(firstTrial.assigned_at);
            const trialLengthDays = firstTrial.database_clusters.trial_length_days || 30;
            const expirationDate = new Date(assignedDate.getTime() + (trialLengthDays * 24 * 60 * 60 * 1000));
            
            trialDetails = {
              total_trial_clusters: activeTrialAssignments.length,
              first_trial_assigned: firstTrial.assigned_at,
              trial_expires: expirationDate.toISOString(),
              days_remaining: Math.max(0, Math.ceil((expirationDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))),
              trial_length_days: trialLengthDays
            };
          }
        }
      }
    } catch (error) {
      console.error('Error checking trial assignments:', error);
      // If enhanced tables don't exist, assume no active trials
      hasActiveTrial = false;
    }

    // Also check for any clusters with 'trial' pricing model that the user has access to
    // through the basic database_clusters table if enhanced tables don't exist
    if (!hasActiveTrial) {
      try {
        const { data: basicClusters, error: basicError } = await dbOperations.supabaseAdmin
          .from('database_clusters')
          .select('id, name, cluster_key, pricing_model, created_by, created_at')
          .eq('created_by', userId)
          .eq('pricing_model', 'trial');

        if (!basicError && basicClusters && basicClusters.length > 0) {
          hasActiveTrial = true;
          trialClusters = basicClusters.map(cluster => ({
            cluster_id: cluster.id,
            cluster_name: cluster.name,
            cluster_key: cluster.cluster_key,
            cluster_created_at: cluster.created_at,
            source: 'owned_cluster'
          }));

          trialDetails = {
            total_trial_clusters: basicClusters.length,
            source: 'owned_clusters',
            first_trial_created: basicClusters[0].created_at
          };
        }
      } catch (error) {
        console.log('Basic cluster check failed, assuming no trials');
      }
    }

    return NextResponse.json({
      success: true,
      hasActiveTrial,
      trialDetails,
      trialClusters,
      user: {
        id: userProfile.id,
        email: userProfile.email
      }
    });

  } catch (error) {
    console.error('Error checking trial status:', error);
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
