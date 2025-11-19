import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { clusterGateway } from '@/services/websocket/cluster-gateway';

// Get status of all user's clusters
// Shows which clusters are online/offline via WebSocket connection
export async function GET(request: NextRequest) {
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

    console.log('Fetching cluster status for user:', user.id);

    // Get all user's clusters with online status from database view
    const { data: clusters, error } = await supabase
      .from('clusters_online_status')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('cluster_key');

    if (error) {
      console.error('Error fetching cluster status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enhance with real-time WebSocket status
    const enhancedClusters = clusters?.map(cluster => {
      const isOnline = clusterGateway.isClusterOnline(cluster.cluster_id);
      const connection = clusterGateway.getClusterConnection(cluster.cluster_id);

      return {
        ...cluster,
        // Real-time WebSocket status (may differ from DB)
        is_connected_realtime: isOnline,
        websocket_state: connection?.ws.readyState,
        last_ping_realtime: connection?.lastPingAt,
        connected_at_realtime: connection?.connectedAt
      };
    });

    // Get WebSocket gateway stats
    const gatewayStats = clusterGateway.getStats();

    console.log(`Found ${clusters?.length || 0} clusters, ${gatewayStats.total_connections} online`);

    return NextResponse.json({
      clusters: enhancedClusters || [],
      gateway_stats: gatewayStats,
      total_clusters: clusters?.length || 0,
      online_clusters: gatewayStats.total_connections
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Get status of a specific cluster
export async function GET_SINGLE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
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

    const clusterId = params.id;

    // Get cluster from database
    const { data: cluster, error } = await supabase
      .from('clusters_online_status')
      .select('*')
      .eq('cluster_id', clusterId)
      .eq('owner_user_id', user.id)
      .single();

    if (error || !cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 });
    }

    // Enhance with real-time WebSocket status
    const isOnline = clusterGateway.isClusterOnline(clusterId);
    const connection = clusterGateway.getClusterConnection(clusterId);

    return NextResponse.json({
      cluster: {
        ...cluster,
        is_connected_realtime: isOnline,
        websocket_state: connection?.ws.readyState,
        last_ping_realtime: connection?.lastPingAt,
        connected_at_realtime: connection?.connectedAt,
        session_id: connection?.sessionId
      }
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
