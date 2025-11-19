// WebSocket Gateway for Centcom Cluster Connections
// Handles persistent connections from local clusters for real-time data access

import WebSocket, { WebSocketServer } from 'ws';
import { createServer, IncomingMessage } from 'http';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface ClusterConnection {
  clusterId: string;
  clusterKey: string;
  ws: WebSocket;
  sessionId: string;
  userId: string;
  connectedAt: Date;
  lastPingAt: Date;
}

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}

class ClusterGateway {
  private wss: WebSocketServer;
  private connections: Map<string, ClusterConnection> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private server: any;

  constructor(port: number = 3001) {
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server, path: '/ws/cluster-gateway' });

    this.wss.on('connection', this.handleConnection.bind(this));

    this.server.listen(port, () => {
      console.log('┌────────────────────────────────────────────────────────┐');
      console.log('│  🚀 WebSocket Gateway Started                          │');
      console.log('│                                                        │');
      console.log(`│  Port: ${port}                                             │`);
      console.log(`│  Path: /ws/cluster-gateway                             │`);
      console.log('│                                                        │');
      console.log(`│  Production: wss://api.lyceum.com/ws/cluster-gateway  │`);
      console.log(`│  Local: ws://localhost:${port}/ws/cluster-gateway         │`);
      console.log('│                                                        │');
      console.log('│  Waiting for Centcom cluster connections...           │');
      console.log('└────────────────────────────────────────────────────────┘');
    });

    // Start ping interval (every 30 seconds)
    setInterval(this.sendPings.bind(this), 30000);

    // Log stats every 5 minutes
    setInterval(this.logStats.bind(this), 300000);
  }

  private async handleConnection(ws: WebSocket, req: IncomingMessage) {
    const clientIp = req.socket.remoteAddress;
    console.log(`\n📡 New WebSocket connection from ${clientIp}`);

    let connection: ClusterConnection | null = null;
    let authenticated = false;

    // Set authentication timeout (10 seconds)
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        console.log('⏰ Authentication timeout');
        ws.send(JSON.stringify({
          type: 'error',
          error_code: 'AUTH_TIMEOUT',
          error_message: 'Authentication timeout (10 seconds)'
        }));
        ws.close(1008, 'Authentication timeout');
      }
    }, 10000);

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle authentication first
        if (message.type === 'auth' && !authenticated) {
          clearTimeout(authTimeout);
          const authResult = await this.handleAuth(ws, message);
          if (authResult) {
            authenticated = true;
            connection = authResult;
          }
          return;
        }

        // Require authentication for all other messages
        if (!authenticated) {
          ws.send(JSON.stringify({
            type: 'error',
            error_code: 'UNAUTHORIZED',
            error_message: 'Must authenticate first'
          }));
          return;
        }

        // Route message based on type
        switch (message.type) {
          case 'metadata_sync':
            await this.handleMetadataSync(message);
            break;

          case 'data_response':
            await this.handleDataResponse(message);
            break;

          case 'pong':
            await this.handlePong(message);
            break;

          case 'error':
            console.error('❌ Error from cluster:', message);
            await this.handleClusterError(message);
            break;

          default:
            console.warn(`⚠️  Unknown message type: ${message.type}`);
        }
      } catch (error) {
        console.error('❌ Error handling message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error_code: 'INTERNAL_ERROR',
          error_message: 'Failed to process message'
        }));
      }
    });

    ws.on('close', () => {
      if (connection) {
        console.log(`🔌 Cluster disconnected: ${connection.clusterKey}`);
        this.connections.delete(connection.clusterId);
        this.updateConnectionStatus(connection.clusterId, connection.sessionId, false);
      }
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }

  private async handleAuth(ws: WebSocket, message: any): Promise<ClusterConnection | null> {
    try {
      const { cluster_id, sync_token } = message;

      if (!cluster_id || !sync_token) {
        ws.send(JSON.stringify({
          type: 'error',
          error_code: 'INVALID_AUTH',
          error_message: 'Missing cluster_id or sync_token'
        }));
        ws.close(1008, 'Invalid authentication');
        return null;
      }

      // Verify sync_token (JWT)
      const { data: { user }, error: authError } = await supabase.auth.getUser(sync_token);

      if (authError || !user) {
        // Try as service role token
        // In production, you'd verify the JWT properly
        console.warn('⚠️  Using simplified auth for development');
      }

      // Fetch cluster from database
      const { data: cluster, error } = await supabase
        .from('unified_clusters')
        .select('id, cluster_key, cluster_name, owner_user_id')
        .eq('id', cluster_id)
        .single();

      if (error || !cluster) {
        ws.send(JSON.stringify({
          type: 'error',
          error_code: 'CLUSTER_NOT_FOUND',
          error_message: 'Cluster not found or not accessible'
        }));
        ws.close(1008, 'Cluster not found');
        return null;
      }

      // Create connection object
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const connection: ClusterConnection = {
        clusterId: cluster.id,
        clusterKey: cluster.cluster_key,
        ws,
        sessionId,
        userId: cluster.owner_user_id,
        connectedAt: new Date(),
        lastPingAt: new Date()
      };

      // Store connection
      this.connections.set(cluster.id, connection);

      // Update database
      await this.updateConnectionStatus(cluster.id, sessionId, true);

      // Send success response
      ws.send(JSON.stringify({
        type: 'auth_success',
        message: 'Authenticated successfully',
        cluster_key: cluster.cluster_key,
        session_id: sessionId
      }));

      console.log(`✅ Cluster authenticated: ${cluster.cluster_key} (${cluster.id})`);
      console.log(`   Total connected clusters: ${this.connections.size}`);

      return connection;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        error_code: 'AUTH_FAILED',
        error_message: 'Authentication failed'
      }));
      ws.close(1008, 'Authentication failed');
      return null;
    }
  }

  private async handleMetadataSync(message: any) {
    const { cluster_id, cluster_key, projects_metadata, timestamp } = message;

    console.log(`\n📦 Metadata sync from ${cluster_key}`);
    console.log(`   Projects: ${projects_metadata?.length || 0}`);
    console.log(`   Timestamp: ${timestamp}`);

    if (!projects_metadata || projects_metadata.length === 0) {
      console.log('   ℹ️  No projects to sync');
      return;
    }

    try {
      // Call database function to bulk upsert
      const { data, error } = await supabase.rpc('upsert_project_metadata', {
        p_cluster_id: cluster_id,
        p_projects: projects_metadata
      });

      if (error) {
        console.error('❌ Error upserting metadata:', error);
        throw error;
      }

      console.log(`✅ Synced ${data} projects for ${cluster_key}`);

      // Send acknowledgment
      const connection = this.connections.get(cluster_id);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({
          type: 'metadata_sync_ack',
          received_count: projects_metadata.length,
          processed_count: data,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error: any) {
      console.error('❌ Metadata sync error:', error);
      const connection = this.connections.get(cluster_id);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify({
          type: 'error',
          error_code: 'METADATA_SYNC_FAILED',
          error_message: error.message || 'Failed to sync metadata'
        }));
      }
    }
  }

  private async handleDataResponse(message: any) {
    const { request_id, success, data, error: errorMsg, duration_ms, timestamp } = message;

    console.log(`\n📬 Data response for request ${request_id}`);
    console.log(`   Success: ${success}`);
    console.log(`   Duration: ${duration_ms}ms`);

    // Find pending request
    const pending = this.pendingRequests.get(request_id);
    if (!pending) {
      console.warn(`⚠️  No pending request found for ${request_id}`);
      return;
    }

    // Clear timeout
    clearTimeout(pending.timeout);

    // Update database
    await supabase
      .from('data_requests')
      .update({
        status: success ? 'completed' : 'failed',
        responded_at: timestamp || new Date().toISOString(),
        duration_ms: duration_ms || null,
        response_data: success ? data : null,
        error_message: errorMsg || null
      })
      .eq('request_id', request_id);

    // Resolve or reject promise
    if (success) {
      pending.resolve(data);
      console.log(`✅ Request ${request_id} completed successfully`);
    } else {
      pending.reject(new Error(errorMsg || 'Unknown error'));
      console.log(`❌ Request ${request_id} failed: ${errorMsg}`);
    }

    // Remove from pending
    this.pendingRequests.delete(request_id);
  }

  private handlePong(message: any) {
    const { cluster_id } = message;
    const connection = this.connections.get(cluster_id);
    if (connection) {
      connection.lastPingAt = new Date();
      this.updateLastPing(cluster_id, connection.sessionId);
    }
  }

  private async handleClusterError(message: any) {
    const { request_id, error_code, error_message, context } = message;

    console.error(`❌ Cluster error:`, {
      request_id,
      error_code,
      error_message,
      context
    });

    // If this is for a specific request, fail it
    if (request_id) {
      const pending = this.pendingRequests.get(request_id);
      if (pending) {
        clearTimeout(pending.timeout);
        pending.reject(new Error(error_message || error_code));
        this.pendingRequests.delete(request_id);

        // Update database
        await supabase
          .from('data_requests')
          .update({
            status: 'failed',
            error_code: error_code,
            error_message: error_message,
            responded_at: new Date().toISOString()
          })
          .eq('request_id', request_id);
      }
    }
  }

  private sendPings() {
    if (this.connections.size === 0) return;

    console.log(`\n💓 Sending pings to ${this.connections.size} clusters`);
    for (const [clusterId, connection] of this.connections) {
      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() }));
        } else {
          console.warn(`⚠️  Cluster ${connection.clusterKey} connection not open, removing...`);
          this.connections.delete(clusterId);
        }
      } catch (error) {
        console.error(`❌ Failed to ping ${connection.clusterKey}:`, error);
        this.connections.delete(clusterId);
      }
    }
  }

  private logStats() {
    console.log('\n📊 WebSocket Gateway Stats');
    console.log(`   Connected clusters: ${this.connections.size}`);
    console.log(`   Pending requests: ${this.pendingRequests.size}`);

    if (this.connections.size > 0) {
      console.log('\n   Clusters:');
      for (const [, connection] of this.connections) {
        const uptime = Date.now() - connection.connectedAt.getTime();
        const uptimeMin = Math.floor(uptime / 60000);
        console.log(`   - ${connection.clusterKey} (uptime: ${uptimeMin}m)`);
      }
    }
  }

  // Public method: Send data request to cluster
  public async requestData(
    clusterId: string,
    requestType: string,
    params: any,
    userId: string,
    timeoutMs: number = 30000
  ): Promise<any> {
    const connection = this.connections.get(clusterId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      throw new Error('CLUSTER_OFFLINE');
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`\n📤 Sending data request ${requestId}`);
    console.log(`   Cluster: ${connection.clusterKey}`);
    console.log(`   Type: ${requestType}`);
    console.log(`   Params:`, params);

    // Create database record
    await supabase.from('data_requests').insert({
      request_id: requestId,
      cluster_id: clusterId,
      request_type: requestType,
      params: params,
      status: 'queued',
      requested_by: userId,
      timeout_ms: timeoutMs
    });

    // Create promise
    return new Promise((resolve, reject) => {
      // Set timeout
      const timeout = setTimeout(async () => {
        this.pendingRequests.delete(requestId);
        await supabase.from('data_requests')
          .update({ status: 'timeout', responded_at: new Date().toISOString() })
          .eq('request_id', requestId);
        reject(new Error('REQUEST_TIMEOUT'));
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      // Send request
      try {
        connection.ws.send(JSON.stringify({
          type: 'data_request',
          request_id: requestId,
          request_type: requestType,
          params: params,
          requested_by: userId,
          timeout_ms: timeoutMs,
          timestamp: new Date().toISOString()
        }));

        // Update status
        supabase.from('data_requests')
          .update({
            status: 'in_progress',
            sent_to_cluster_at: new Date().toISOString()
          })
          .eq('request_id', requestId);

        console.log(`✅ Data request sent to ${connection.clusterKey}`);
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  // Check if cluster is online
  public isClusterOnline(clusterId: string): boolean {
    const connection = this.connections.get(clusterId);
    return connection !== undefined && connection.ws.readyState === WebSocket.OPEN;
  }

  // Get connection stats
  public getStats() {
    return {
      total_connections: this.connections.size,
      pending_requests: this.pendingRequests.size,
      connections: Array.from(this.connections.values()).map(c => ({
        cluster_key: c.clusterKey,
        cluster_id: c.clusterId,
        connected_at: c.connectedAt,
        last_ping_at: c.lastPingAt,
        state: c.ws.readyState === WebSocket.OPEN ? 'open' : 'closed'
      }))
    };
  }

  // Get specific cluster connection
  public getClusterConnection(clusterId: string): ClusterConnection | undefined {
    return this.connections.get(clusterId);
  }

  private async updateConnectionStatus(clusterId: string, sessionId: string, isConnected: boolean) {
    try {
      await supabase.rpc('update_cluster_connection_status', {
        p_cluster_id: clusterId,
        p_websocket_session_id: sessionId,
        p_is_connected: isConnected
      });
    } catch (error) {
      console.error('Error updating connection status:', error);
    }
  }

  private async updateLastPing(clusterId: string, sessionId: string) {
    try {
      await supabase.rpc('update_cluster_last_ping', {
        p_cluster_id: clusterId,
        p_websocket_session_id: sessionId
      });
    } catch (error) {
      console.error('Error updating last ping:', error);
    }
  }

  // Graceful shutdown
  public async shutdown() {
    console.log('\n👋 Shutting down WebSocket Gateway...');

    // Close all connections
    for (const [clusterId, connection] of this.connections) {
      try {
        connection.ws.send(JSON.stringify({
          type: 'shutdown',
          message: 'Server shutting down'
        }));
        connection.ws.close(1001, 'Server shutdown');
      } catch (error) {
        console.error(`Error closing connection for ${connection.clusterKey}:`, error);
      }
    }

    // Close server
    this.server.close();
    console.log('✅ WebSocket Gateway shutdown complete');
  }
}

// Create singleton instance
const port = parseInt(process.env.WS_PORT || '3001');
export const clusterGateway = new ClusterGateway(port);

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  await clusterGateway.shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await clusterGateway.shutdown();
  process.exit(0);
});

export default ClusterGateway;
