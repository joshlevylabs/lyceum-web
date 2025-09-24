import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { clusterAdminOperations } from '@/lib/cluster-admin-operations';

export async function GET(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Get user's accessible clusters
    const accessibleClusters = await clusterAdminOperations.getUserAccessibleClusters(user.id);

    // Filter out expired trials and validate access
    const validClusters = accessibleClusters.filter(cluster => {
      // Check if trial has expired
      if (cluster.pricing_model === 'trial' && cluster.trial_end_date) {
        const trialEnd = new Date(cluster.trial_end_date);
        const now = new Date();
        if (trialEnd < now) {
          return false; // Trial expired
        }
      }

      // Check if user access has expired
      if (cluster.expires_at) {
        const expiresAt = new Date(cluster.expires_at);
        const now = new Date();
        if (expiresAt < now) {
          return false; // User access expired
        }
      }

      // Check cluster status
      if (cluster.cluster_status === 'expired' || cluster.cluster_status === 'suspended') {
        return false; // Cluster not accessible
      }

      return true;
    });

    // Add additional metadata for Centcom integration
    const enrichedClusters = validClusters.map(cluster => ({
      ...cluster,
      accessible: true,
      access_validated_at: new Date().toISOString(),
      centcom_integration: {
        cluster_id: cluster.cluster_id,
        user_id: user.id,
        access_level: cluster.access_level,
        pricing_model: cluster.pricing_model,
        trial_info: cluster.pricing_model === 'trial' ? {
          trial_end_date: cluster.trial_end_date,
          days_remaining: cluster.trial_end_date 
            ? Math.ceil((new Date(cluster.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null
        } : null
      }
    }));

    return NextResponse.json({
      clusters: enrichedClusters,
      total_count: enrichedClusters.length,
      access_summary: {
        owned_clusters: enrichedClusters.filter(c => c.access_level === 'owner').length,
        assigned_clusters: enrichedClusters.filter(c => c.access_level !== 'owner').length,
        trial_clusters: enrichedClusters.filter(c => c.pricing_model === 'trial').length,
        free_clusters: enrichedClusters.filter(c => c.pricing_model === 'free').length,
        paid_clusters: enrichedClusters.filter(c => c.pricing_model === 'paid').length
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error fetching accessible clusters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accessible clusters' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
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
