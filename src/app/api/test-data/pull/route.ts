import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { clusterGateway } from '@/services/websocket/cluster-gateway';
import { getCachedProject, setCachedProject } from '@/lib/redis';

// Request full data from a cluster via WebSocket
// This is the on-demand data fetching endpoint
export async function POST(request: NextRequest) {
  try {
    // Get user from session
    const cookieStore = await cookies();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        global: {
          headers: {
            cookie: cookieStore.toString()
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cluster_id, request_type, params } = body;

    if (!cluster_id || !request_type || !params) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_REQUEST',
          message: 'Missing required fields: cluster_id, request_type, params'
        },
        { status: 400 }
      );
    }

    console.log('Data pull request:', { cluster_id, request_type, params, user: user.id });

    // Verify user owns this cluster
    const { data: cluster, error: clusterError } = await supabase
      .from('unified_clusters')
      .select('id, cluster_key, cluster_name')
      .eq('id', cluster_id)
      .eq('owner_user_id', user.id)
      .single();

    if (clusterError || !cluster) {
      return NextResponse.json(
        {
          success: false,
          error: 'CLUSTER_NOT_FOUND',
          message: 'Cluster not found or not accessible'
        },
        { status: 404 }
      );
    }

    // Check cache first (for get_project_full requests)
    if (request_type === 'get_project_full' && params.project_key) {
      const cached = await getCachedProject(cluster_id, params.project_key);
      if (cached) {
        console.log(`✅ Cache hit for project ${params.project_key}`);
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true,
          cluster: {
            id: cluster.id,
            key: cluster.cluster_key,
            name: cluster.cluster_name
          }
        });
      }
    }

    // Check if cluster is online
    const isOnline = clusterGateway.isClusterOnline(cluster_id);
    if (!isOnline) {
      console.warn(`Cluster ${cluster.cluster_key} is offline`);
      return NextResponse.json(
        {
          success: false,
          error: 'CLUSTER_OFFLINE',
          message: `Cluster ${cluster.cluster_key} is not online. Please ensure Centcom is running on the cluster machine.`,
          cluster: {
            id: cluster.id,
            key: cluster.cluster_key,
            name: cluster.cluster_name
          }
        },
        { status: 503 }
      );
    }

    // Send request to cluster via WebSocket
    try {
      const startTime = Date.now();

      const data = await clusterGateway.requestData(
        cluster_id,
        request_type,
        params,
        user.id,
        30000 // 30 second timeout
      );

      const duration = Date.now() - startTime;

      console.log(`✅ Data received in ${duration}ms`);

      // Cache the response (for get_project_full only)
      if (request_type === 'get_project_full' && params.project_key) {
        await setCachedProject(cluster_id, params.project_key, data);
      }

      return NextResponse.json({
        success: true,
        data,
        cached: false,
        duration_ms: duration,
        cluster: {
          id: cluster.id,
          key: cluster.cluster_key,
          name: cluster.cluster_name
        }
      });
    } catch (error: any) {
      console.error('Error fetching data from cluster:', error);

      // Handle specific errors
      if (error.message === 'CLUSTER_OFFLINE') {
        return NextResponse.json(
          {
            success: false,
            error: 'CLUSTER_OFFLINE',
            message: 'Cluster went offline during request'
          },
          { status: 503 }
        );
      }

      if (error.message === 'REQUEST_TIMEOUT') {
        return NextResponse.json(
          {
            success: false,
            error: 'TIMEOUT',
            message: 'Request timed out after 30 seconds. The cluster may be under heavy load or processing a large project.'
          },
          { status: 504 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'CLUSTER_ERROR',
          message: error.message || 'Failed to fetch data from cluster'
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error.message
      },
      { status: 500 }
    );
  }
}
