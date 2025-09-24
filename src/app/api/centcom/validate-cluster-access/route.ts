import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { clusterAdminOperations } from '@/lib/cluster-admin-operations';

/**
 * Centcom Integration Endpoint for Cluster Access Validation
 * 
 * This endpoint is called by Centcom during user authentication to:
 * 1. Validate if a user has access to specific clusters
 * 2. Return cluster permissions and metadata
 * 3. Check trial status and expiration
 * 4. Populate test data projects accordingly
 */

export async function POST(request: NextRequest) {
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
    const body = await request.json();
    const { cluster_id, validate_all } = body;

    // If cluster_id is provided, validate specific cluster access
    if (cluster_id) {
      const accessInfo = await clusterAdminOperations.checkClusterAccess(cluster_id, user.id);
      
      // Additional validation logic for trials and expiration
      const validationResult = {
        cluster_id,
        user_id: user.id,
        user_email: user.email,
        has_access: accessInfo.hasAccess,
        access_level: accessInfo.accessLevel,
        cluster_status: accessInfo.clusterStatus,
        pricing_model: accessInfo.pricingModel,
        expires_at: accessInfo.expiresAt,
        validation_timestamp: new Date().toISOString(),
        centcom_integration: {
          allow_projects: accessInfo.hasAccess && 
                          accessInfo.clusterStatus !== 'expired' && 
                          accessInfo.clusterStatus !== 'suspended',
          permissions: {
            can_create_projects: ['owner', 'admin', 'editor'].includes(accessInfo.accessLevel),
            can_edit_projects: ['owner', 'admin', 'editor'].includes(accessInfo.accessLevel),
            can_view_projects: accessInfo.hasAccess,
            can_analyze_data: ['owner', 'admin', 'editor', 'analyst'].includes(accessInfo.accessLevel),
            can_export_data: ['owner', 'admin', 'editor', 'analyst'].includes(accessInfo.accessLevel),
            can_invite_users: ['owner', 'admin'].includes(accessInfo.accessLevel)
          },
          trial_info: accessInfo.pricingModel === 'trial' ? {
            is_trial: true,
            expires_at: accessInfo.expiresAt,
            show_trial_banner: true,
            upgrade_prompt: accessInfo.expiresAt ? 
              new Date(accessInfo.expiresAt).getTime() < Date.now() + (7 * 24 * 60 * 60 * 1000) : false // 7 days warning
          } : null
        }
      };

      return NextResponse.json(validationResult, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // If validate_all is true, return all accessible clusters
    if (validate_all) {
      const accessibleClusters = await clusterAdminOperations.getUserAccessibleClusters(user.id);
      
      const enrichedClusters = accessibleClusters.map(cluster => {
        const isTrialExpired = cluster.pricing_model === 'trial' && cluster.trial_end_date && 
                              new Date(cluster.trial_end_date) < new Date();
        const isAccessExpired = cluster.expires_at && new Date(cluster.expires_at) < new Date();
        const isAccessible = !isTrialExpired && !isAccessExpired && 
                            cluster.cluster_status !== 'expired' && 
                            cluster.cluster_status !== 'suspended';

        return {
          cluster_id: cluster.cluster_id,
          cluster_name: cluster.cluster_name,
          cluster_type: cluster.cluster_type,
          access_level: cluster.access_level,
          pricing_model: cluster.pricing_model,
          cluster_status: cluster.cluster_status,
          has_access: isAccessible,
          expires_at: cluster.expires_at,
          trial_end_date: cluster.trial_end_date,
          centcom_integration: {
            allow_projects: isAccessible,
            permissions: {
              can_create_projects: ['owner', 'admin', 'editor'].includes(cluster.access_level),
              can_edit_projects: ['owner', 'admin', 'editor'].includes(cluster.access_level),
              can_view_projects: isAccessible,
              can_analyze_data: ['owner', 'admin', 'editor', 'analyst'].includes(cluster.access_level),
              can_export_data: ['owner', 'admin', 'editor', 'analyst'].includes(cluster.access_level),
              can_invite_users: ['owner', 'admin'].includes(cluster.access_level)
            },
            trial_info: cluster.pricing_model === 'trial' ? {
              is_trial: true,
              trial_end_date: cluster.trial_end_date,
              days_remaining: cluster.trial_end_date ? 
                Math.max(0, Math.ceil((new Date(cluster.trial_end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0,
              show_trial_banner: true,
              upgrade_prompt: cluster.trial_end_date ? 
                new Date(cluster.trial_end_date).getTime() < Date.now() + (7 * 24 * 60 * 60 * 1000) : false
            } : null
          }
        };
      });

      const validationSummary = {
        user_id: user.id,
        user_email: user.email,
        validation_timestamp: new Date().toISOString(),
        accessible_clusters: enrichedClusters,
        summary: {
          total_clusters: enrichedClusters.length,
          accessible_clusters: enrichedClusters.filter(c => c.has_access).length,
          trial_clusters: enrichedClusters.filter(c => c.pricing_model === 'trial').length,
          owned_clusters: enrichedClusters.filter(c => c.access_level === 'owner').length,
          assigned_clusters: enrichedClusters.filter(c => c.access_level !== 'owner').length,
          expiring_trials: enrichedClusters.filter(c => 
            c.centcom_integration.trial_info?.upgrade_prompt
          ).length
        },
        centcom_metadata: {
          session_valid: true,
          requires_upgrade_prompt: enrichedClusters.some(c => 
            c.centcom_integration.trial_info?.upgrade_prompt
          ),
          feature_flags: {
            show_create_cluster_button: user.role === 'admin',
            show_billing_section: true,
            show_usage_dashboard: true,
            enable_byod_connections: true
          }
        }
      };

      return NextResponse.json(validationSummary, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    return NextResponse.json(
      { error: 'Either cluster_id or validate_all parameter is required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error validating cluster access for Centcom:', error);
    return NextResponse.json(
      { 
        error: 'Cluster access validation failed',
        user_id: null,
        has_access: false,
        validation_timestamp: new Date().toISOString()
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function GET(request: NextRequest) {
  // GET endpoint for health check and basic cluster info
  try {
    const authResult = await requireAuth(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { user } = authResult;

    // Return basic user cluster information for Centcom
    const accessibleClusters = await clusterAdminOperations.getUserAccessibleClusters(user.id);
    
    return NextResponse.json({
      integration_status: 'active',
      user_id: user.id,
      user_email: user.email,
      cluster_count: accessibleClusters.length,
      last_validation: new Date().toISOString(),
      endpoint_version: '1.0.0',
      supported_operations: ['validate_cluster_access', 'get_accessible_clusters', 'check_trial_status']
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });

  } catch (error) {
    console.error('Error in Centcom integration health check:', error);
    return NextResponse.json(
      { 
        integration_status: 'error',
        last_validation: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
