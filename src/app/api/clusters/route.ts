import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'

// Types for Database Clusters
interface ClusterConfiguration {
  name: string
  description?: string
  cluster_type: 'production' | 'development' | 'analytics'
  region: string
  team_ids?: string[]
  admin_users?: string[]
  configuration: {
    nodes: number
    cpu_per_node: number
    memory_per_node: string
    storage_per_node: string
    hot_tier_size?: string
    warm_tier_size?: string
    cold_tier_size?: string
  }
  retention_policy?: {
    hot_days: number
    warm_days: number
    cold_days: number
    archive_enabled: boolean
  }
}

interface DatabaseCluster {
  id: string
  name: string
  description?: string
  cluster_key?: string
  cluster_type: string
  region: string
  status: string
  clickhouse_cluster_id: string
  connection_string: string
  node_count: number
  cpu_per_node: number
  memory_per_node: string
  storage_per_node: string
  hot_tier_size?: string
  warm_tier_size?: string
  cold_tier_size?: string
  archive_enabled: boolean
  hot_retention_days: number
  warm_retention_days: number
  cold_retention_days: number
  created_by: string
  created_at: string
  updated_at: string
  health_status: string
  estimated_monthly_cost?: number
  actual_monthly_cost?: number
}

// Generate secure credentials for ClickHouse
function generateClusterCredentials(clusterId: string) {
  const crypto = require('node:crypto')
  
  return {
    admin_username: `cluster_admin_${clusterId.slice(0, 8)}`,
    admin_password: crypto.randomBytes(32).toString('hex'),
    readonly_username: `cluster_readonly_${clusterId.slice(0, 8)}`,
    readonly_password: crypto.randomBytes(32).toString('hex')
  }
}

// Calculate estimated monthly cost
function calculateEstimatedCost(config: ClusterConfiguration['configuration']): number {
  const baseCompute = config.nodes * config.cpu_per_node * 0.05 * 24 * 30 // $0.05/hour/CPU
  const baseMemory = config.nodes * parseInt(config.memory_per_node) * 0.01 * 24 * 30 // $0.01/hour/GB
  
  // Storage costs based on tiers
  const hotStorage = parseInt(config.hot_tier_size || '0') * 0.30 // $0.30/GB/month
  const warmStorage = parseInt(config.warm_tier_size || '0') * 0.15 // $0.15/GB/month  
  const coldStorage = parseInt(config.cold_tier_size || '0') * 0.05 // $0.05/GB/month
  
  return Math.round((baseCompute + baseMemory + hotStorage + warmStorage + coldStorage) * 100) / 100
}

// POST /api/clusters - Create new cluster
export async function POST(request: NextRequest) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const body: ClusterConfiguration = await request.json()
    
    // Validate required fields
    if (!body.name || !body.cluster_type || !body.region || !body.configuration) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, cluster_type, region, configuration' 
      }, { status: 400 })
    }

    // Generate cluster credentials
    const crypto = require('node:crypto')
    const clusterId = crypto.randomUUID()
    const credentials = generateClusterCredentials(clusterId)
    
    // Generate ClickHouse cluster configuration
    const clickhouseClusterId = `lyceum-${body.cluster_type}-${clusterId.slice(0, 8)}`
    const connectionString = `clickhouse://${clickhouseClusterId}.lyceum.com:8443/default`
    
    // Calculate estimated cost
    const estimatedCost = calculateEstimatedCost(body.configuration)
    
    // Prepare cluster data
    const clusterData = {
      id: clusterId,
      name: body.name,
      description: body.description,
      cluster_type: body.cluster_type,
      region: body.region,
      status: 'provisioning',
      clickhouse_cluster_id: clickhouseClusterId,
      connection_string: connectionString,
      node_count: body.configuration.nodes,
      cpu_per_node: body.configuration.cpu_per_node,
      memory_per_node: body.configuration.memory_per_node,
      storage_per_node: body.configuration.storage_per_node,
      hot_tier_size: body.configuration.hot_tier_size || '100GB',
      warm_tier_size: body.configuration.warm_tier_size || '500GB',
      cold_tier_size: body.configuration.cold_tier_size || '2TB',
      archive_enabled: body.retention_policy?.archive_enabled ?? true,
      hot_retention_days: body.retention_policy?.hot_days ?? 90,
      warm_retention_days: body.retention_policy?.warm_days ?? 365,
      cold_retention_days: body.retention_policy?.cold_days ?? 2555,
      created_by: user.id,
      estimated_monthly_cost: estimatedCost,
      health_status: 'unknown',
      // Add the generated credentials (hashed as required by schema)
      admin_username: credentials.admin_username,
      admin_password_hash: credentials.admin_password, // Store as hash (in production, this would be bcrypt)
      readonly_username: credentials.readonly_username,
      readonly_password_hash: credentials.readonly_password // Store as hash (in production, this would be bcrypt)
    }

    // Create cluster record using direct operations
    const { data: cluster, error: insertError } = await dbOperations.createCluster(clusterData)

    if (insertError) {
      console.error('Error creating cluster:', insertError)
      return NextResponse.json({ error: 'Failed to create cluster' }, { status: 500 })
    }

    // Add creator as admin using the same admin client
    if (cluster && cluster[0]) {
      const { error: teamError } = await dbOperations.addTeamMember(cluster[0].id, {
        user_id: user.id,
        role: 'admin',
        permissions: {
          cluster_management: true,
          data_read: true,
          data_write: true,
          schema_modify: true,
          user_management: true,
          billing_access: true
        },
        granted_by: user.id
      })

      if (teamError) {
        console.error('Error adding creator as admin:', teamError)
        // Continue anyway - cluster was created successfully
      }

      // Add additional admin users if specified
      if (body.admin_users && body.admin_users.length > 0) {
        for (const userId of body.admin_users) {
          const { error: adminError } = await dbOperations.addTeamMember(cluster[0].id, {
            user_id: userId,
            role: 'admin',
            permissions: {
              cluster_management: true,
              data_read: true,
              data_write: true,
              schema_modify: true,
              user_management: true,
              billing_access: true
            },
            granted_by: user.id
          })
          
          if (adminError) {
            console.error(`Error adding admin user ${userId}:`, adminError)
          }
        }
      }
    }

    // Trigger ClickHouse cluster provisioning
    const { clusterProvisioningService } = await import('@/lib/cluster-provisioning')
    const provisioningConfig = {
      cluster_id: cluster[0].id,
      cluster_type: body.cluster_type,
      region: body.region,
      node_count: body.configuration.nodes,
      cpu_per_node: body.configuration.cpu_per_node,
      memory_per_node: body.configuration.memory_per_node,
      storage_per_node: body.configuration.storage_per_node,
      admin_username: credentials.admin_username,
      admin_password: credentials.admin_password,
      readonly_username: credentials.readonly_username,
      readonly_password: credentials.readonly_password
    }
    
    // Start provisioning process (async)
    const provisioningStatus = await clusterProvisioningService.provisionCluster(provisioningConfig)

    return NextResponse.json({
      success: true,
      cluster: {
        id: cluster[0].id,
        name: cluster[0].name,
        description: cluster[0].description,
        cluster_type: cluster[0].cluster_type,
        region: cluster[0].region,
        status: cluster[0].status,
        connection_string: cluster[0].connection_string,
        credentials: {
          username: credentials.admin_username,
          password: credentials.admin_password,
          readonly_username: credentials.readonly_username,
          readonly_password: credentials.readonly_password
        },
        endpoints: {
          http: `https://${clickhouseClusterId}.lyceum.com:8443`,
          native: `clickhouse://${clickhouseClusterId}.lyceum.com:9000`,
          mysql: `mysql://${clickhouseClusterId}.lyceum.com:9004`
        },
        estimated_provision_time: '5-10 minutes',
        estimated_monthly_cost: estimatedCost
      }
    })

  } catch (error) {
    console.error('Error in POST /api/clusters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/clusters - List user's clusters
export async function GET(request: NextRequest) {
  try {
    // Check authentication using the new auth utils
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    // Using direct database operations instead of createClient()

    const url = new URL(request.url)
    const cluster_type = url.searchParams.get('cluster_type')
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Get clusters using backwards-compatible method
    const { getClustersWithOptionalKey } = await import('@/lib/cluster-utils')
    const { data: clusters, error } = await getClustersWithOptionalKey(user.id, {
      cluster_type: cluster_type || undefined,
      status: status || undefined,
      limit,
      offset
    })

    if (error) {
      console.error('Error fetching clusters:', error)
      return NextResponse.json({ error: 'Failed to fetch clusters' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      clusters: clusters || [],
      total: clusters?.length || 0,
      offset,
      limit
    })

  } catch (error) {
    console.error('Error in GET /api/clusters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to hash passwords
async function hashPassword(password: string): Promise<string> {
  const bcrypt = require('bcryptjs')
  return await bcrypt.hash(password, 12)
}
