import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { dbOperations } from '@/lib/supabase-direct'
import { OptimizedClusterService, OPTIMIZED_TIERS } from '@/services/optimizedClusterService'

// Types for Unified Cluster System
interface UnifiedClusterConfiguration {
  name: string
  description?: string
  architecture: 'traditional' | 'optimized'
  cluster_type: 'development' | 'staging' | 'production' | 'analytics'
  region: string
  
  // Billing and user assignment
  responsible_user_id?: string // Who pays for this cluster
  assigned_users?: string[] // Who can access this cluster
  max_assigned_users?: number
  
  // Traditional cluster configuration
  traditional_config?: {
    nodes: number
    cpu_per_node: number
    memory_per_node: string
    storage_per_node: string
    hot_tier_size?: string
    warm_tier_size?: string
    cold_tier_size?: string
    retention_policy?: {
      hot_days: number
      warm_days: number
      cold_days: number
      archive_enabled: boolean
    }
  }
  
  // Optimized cluster configuration
  optimized_config?: {
    tier: 'micro' | 'starter' | 'professional' | 'enterprise'
    monthly_curves_limit: number
    storage_limit: string
    customer_id?: string
  }
  
  // Pricing
  pricing_model: 'free' | 'trial' | 'paid' | 'optimized'
  estimated_monthly_cost?: number
}

interface UnifiedCluster {
  id: string
  cluster_key: string
  name: string
  description?: string
  architecture: 'traditional' | 'optimized'
  cluster_type: string
  tier?: string
  status: string
  health_status: string
  region: string
  
  // Traditional cluster fields (null for optimized)
  node_count?: number
  cpu_per_node?: number
  memory_per_node?: string
  storage_per_node?: string
  connection_string?: string
  
  // Optimized cluster fields (null for traditional)
  customer_id?: string
  monthly_curves_limit?: number
  storage_limit?: string
  processing_endpoint?: string
  
  // Billing and cost
  estimated_monthly_cost: number
  actual_monthly_cost?: number
  pricing_model: string
  responsible_user_id?: string
  
  // Usage and assignment
  current_assigned_users: number
  max_assigned_users: number
  
  // Timestamps
  created_by: string
  created_at: string
  updated_at: string
}

// Helper function to generate cluster credentials (for traditional clusters)
function generateClusterCredentials(clusterId: string) {
  const crypto = require('node:crypto')
  return {
    admin_username: `admin_${clusterId.slice(0, 8)}`,
    admin_password: crypto.randomBytes(16).toString('hex'),
    readonly_username: `readonly_${clusterId.slice(0, 8)}`,
    readonly_password: crypto.randomBytes(16).toString('hex')
  }
}

// Calculate estimated cost based on configuration
function calculateEstimatedCost(config: UnifiedClusterConfiguration): number {
  if (config.architecture === 'optimized' && config.optimized_config) {
    const tier = OPTIMIZED_TIERS.find(t => t.id === config.optimized_config?.tier)
    return tier?.price || 0
  }
  
  if (config.architecture === 'traditional' && config.traditional_config) {
    const { nodes, cpu_per_node, memory_per_node, storage_per_node } = config.traditional_config
    
    // Base cost calculation for traditional clusters
    const cpuCost = nodes * cpu_per_node * 15 // $15 per CPU per month
    const memoryCost = nodes * parseInt(memory_per_node.replace('GB', '')) * 2 // $2 per GB per month
    const storageCost = nodes * parseInt(storage_per_node.replace('GB', '')) * 0.5 // $0.50 per GB per month
    
    return cpuCost + memoryCost + storageCost
  }
  
  return 0
}

// POST /api/clusters - Create new unified cluster
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const body: UnifiedClusterConfiguration = await request.json()
    
    // Validate required fields
    if (!body.name || !body.architecture || !body.cluster_type || !body.region) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, architecture, cluster_type, region' 
      }, { status: 400 })
    }

    // Validate architecture-specific configuration
    if (body.architecture === 'traditional' && !body.traditional_config) {
      return NextResponse.json({ 
        error: 'Traditional clusters require traditional_config' 
      }, { status: 400 })
    }
    
    if (body.architecture === 'optimized' && !body.optimized_config) {
      return NextResponse.json({ 
        error: 'Optimized clusters require optimized_config' 
      }, { status: 400 })
    }

    const clusterId = require('node:crypto').randomUUID()
    const estimatedCost = body.estimated_monthly_cost || calculateEstimatedCost(body)
    
    // Prepare base cluster data
    const clusterData: any = {
      id: clusterId,
      name: body.name,
      description: body.description,
      architecture: body.architecture,
      cluster_type: body.cluster_type,
      region: body.region,
      status: 'creating',
      classification: (body as any).classification || 'enterprise',
      estimated_monthly_cost: estimatedCost,
      pricing_model: body.pricing_model || 'paid',
      responsible_user_id: (body as any).classification === 'gratis' ? null : (body.responsible_user_id || user.id),
      max_assigned_users: body.max_assigned_users || 50,
      current_assigned_users: 0,
      created_by: user.id,
      health_status: 'unknown'
    }

    // Add architecture-specific configuration
    if (body.architecture === 'traditional' && body.traditional_config) {
      const credentials = generateClusterCredentials(clusterId)
      const clickhouseClusterId = `lyceum-${body.cluster_type}-${clusterId.slice(0, 8)}`
      
      clusterData.node_count = body.traditional_config.nodes
      clusterData.cpu_per_node = body.traditional_config.cpu_per_node
      clusterData.memory_per_node = body.traditional_config.memory_per_node
      clusterData.storage_per_node = body.traditional_config.storage_per_node
      clusterData.hot_tier_size = body.traditional_config.hot_tier_size || '100GB'
      clusterData.warm_tier_size = body.traditional_config.warm_tier_size || '500GB'
      clusterData.cold_tier_size = body.traditional_config.cold_tier_size || '2TB'
      clusterData.archive_enabled = body.traditional_config.retention_policy?.archive_enabled ?? true
      clusterData.connection_string = `clickhouse://${clickhouseClusterId}.lyceum.com:8443/default`
      clusterData.admin_username = credentials.admin_username
      clusterData.admin_password_hash = credentials.admin_password
      clusterData.readonly_username = credentials.readonly_username
      clusterData.readonly_password_hash = credentials.readonly_password
    }
    
    if (body.architecture === 'optimized' && body.optimized_config) {
      const tier = OPTIMIZED_TIERS.find(t => t.id === body.optimized_config?.tier)
      const customerId = body.optimized_config.customer_id || `customer-${Date.now()}`
      
      clusterData.tier = body.optimized_config.tier
      clusterData.customer_id = customerId
      clusterData.monthly_curves_limit = body.optimized_config.monthly_curves_limit || tier?.curves || 0
      clusterData.storage_limit = body.optimized_config.storage_limit || tier?.storage || '1GB'
      clusterData.processing_endpoint = 'https://us-central1-lyceum-clusters-optimized.cloudfunctions.net/processCurves'
      clusterData.tier_features = tier?.features || []
    }

    // Create cluster record
    const { data: cluster, error: insertError } = await dbOperations.supabaseAdmin
      .from('unified_clusters')
      .insert(clusterData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating cluster:', insertError)
      return NextResponse.json({ error: 'Failed to create cluster' }, { status: 500 })
    }

    // Add creator as owner
    const { error: assignmentError } = await dbOperations.supabaseAdmin
      .from('cluster_user_assignments')
      .insert({
        cluster_id: cluster.id,
        user_id: user.id,
        access_level: 'owner',
        assigned_by: user.id,
        is_active: true
      })

    if (assignmentError) {
      console.error('Error assigning creator to cluster:', assignmentError)
      // Don't fail the creation, but log the error
    }

    // For optimized clusters, test the processing endpoint
    if (body.architecture === 'optimized' && clusterData.customer_id) {
      try {
        const testResult = await OptimizedClusterService.processCurves(clusterData.customer_id, 1)
        console.log('Optimized cluster test successful:', testResult)
      } catch (error) {
        console.error('Optimized cluster test failed:', error)
        // Don't fail creation, but note the issue
      }
    }

    // Update status to active
    await dbOperations.supabaseAdmin
      .from('unified_clusters')
      .update({ status: 'active' })
      .eq('id', cluster.id)

    // Return success response with appropriate configuration
    const response: any = {
      success: true,
      cluster: {
        id: cluster.id,
        cluster_key: cluster.cluster_key,
        name: cluster.name,
        description: cluster.description,
        architecture: cluster.architecture,
        cluster_type: cluster.cluster_type,
        tier: cluster.tier,
        status: 'active',
        region: cluster.region,
        estimated_monthly_cost: cluster.estimated_monthly_cost,
        responsible_user_id: cluster.responsible_user_id,
        created_at: cluster.created_at
      }
    }

    // Add architecture-specific response data
    if (body.architecture === 'traditional') {
      response.cluster.connection_details = {
        connection_string: clusterData.connection_string,
        admin_username: clusterData.admin_username,
        admin_password: clusterData.admin_password_hash,
        readonly_username: clusterData.readonly_username,
        readonly_password: clusterData.readonly_password_hash
      }
      response.cluster.resource_configuration = body.traditional_config
    }
    
    if (body.architecture === 'optimized') {
      response.cluster.optimized_details = {
        customer_id: clusterData.customer_id,
        processing_endpoint: clusterData.processing_endpoint,
        monthly_curves_limit: clusterData.monthly_curves_limit,
        storage_limit: clusterData.storage_limit,
        tier_features: clusterData.tier_features
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in POST /api/clusters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/clusters - List user's clusters (with new unified system)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { user, error: authError, response: authResponse } = await requireAuth(request)
    if (authResponse) return authResponse
    
    const url = new URL(request.url)
    const architecture = url.searchParams.get('architecture')
    const cluster_type = url.searchParams.get('cluster_type')
    const status = url.searchParams.get('status')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Try to query unified_clusters table first
    try {
      // Build query for clusters the user has access to
      let query = dbOperations.supabaseAdmin
        .from('unified_clusters')
        .select(`
          *,
          cluster_user_assignments!inner(
            access_level,
            assigned_at,
            is_active
          )
        `)
        .eq('cluster_user_assignments.user_id', user.id)
        .eq('cluster_user_assignments.is_active', true)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Apply filters
      if (architecture) {
        query = query.eq('architecture', architecture)
      }
      if (cluster_type) {
        query = query.eq('cluster_type', cluster_type)
      }
      if (status) {
        query = query.eq('status', status)
      }

      const { data: clusters, error } = await query

      if (error) {
        throw error
      }

      // Transform data for frontend compatibility
      const transformedClusters = (clusters || []).map(cluster => ({
        id: cluster.id,
        cluster_key: cluster.cluster_key,
        name: cluster.name,
        description: cluster.description,
        architecture: cluster.architecture,
        cluster_type: cluster.cluster_type,
        tier: cluster.tier,
        status: cluster.status,
        health_status: cluster.health_status,
        region: cluster.region,
        
        // Traditional cluster fields
        node_count: cluster.node_count,
        cpu_per_node: cluster.cpu_per_node,
        memory_per_node: cluster.memory_per_node,
        storage_per_node: cluster.storage_per_node,
        hot_tier_size: cluster.hot_tier_size,
        warm_tier_size: cluster.warm_tier_size,
        cold_tier_size: cluster.cold_tier_size,
        archive_enabled: cluster.archive_enabled,
        
        // Optimized cluster fields
        customer_id: cluster.customer_id,
        monthly_curves_limit: cluster.monthly_curves_limit,
        storage_limit: cluster.storage_limit,
        processing_endpoint: cluster.processing_endpoint,
        tier_features: cluster.tier_features,
        
        // Billing and costs
        estimated_monthly_cost: cluster.estimated_monthly_cost,
        actual_monthly_cost: cluster.actual_monthly_cost,
        pricing_model: cluster.pricing_model === 'optimized' ? 'optimized' : cluster.pricing_model,
        responsible_user_id: cluster.responsible_user_id,
        
        // User assignment info
        current_assigned_users: cluster.current_assigned_users,
        max_assigned_users: cluster.max_assigned_users,
        user_role: cluster.cluster_user_assignments[0]?.access_level || 'user',
        
        // Timestamps
        created_at: cluster.created_at,
        updated_at: cluster.updated_at,
        
        // For backwards compatibility with existing UI
        optimized_config: cluster.architecture === 'optimized' ? {
          monthly_curves: cluster.monthly_curves_limit,
          storage_limit: cluster.storage_limit,
          processing_endpoint: cluster.processing_endpoint,
          tier_features: cluster.tier_features
        } : undefined
      }))

      // Also fetch CentCom clusters (local clusters) - using manual join
      let centcomClusters: any[] = []
      try {
        const { data: localClusters, error: localError } = await dbOperations.supabaseAdmin
          .from('local_cluster_usage')
          .select('*')
          .eq('user_id', user.id)
          .order('last_heartbeat_at', { ascending: false })

        if (localError) {
          console.error('Error fetching local clusters:', localError)
        }

        if (localClusters && localClusters.length > 0) {
          console.log(`Found ${localClusters.length} local cluster records for user ${user.id}`)

          // Log all cluster identifiers to debug duplication
          console.log('All cluster identifiers:', localClusters.map(c => ({
            cluster_key: c.cluster_key,
            cluster_id: c.cluster_id,
            machine_fingerprint: c.machine_fingerprint?.substring(0, 8),
            heartbeat: c.last_heartbeat_at
          })))

          // Filter out old test data: only keep clusters with recent heartbeats (last 30 days)
          // and valid cluster_key (not null)
          const thirtyDaysAgo = new Date()
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

          const recentClusters = localClusters.filter(cluster => {
            const hasValidKey = cluster.cluster_key && cluster.cluster_key !== 'null'
            const hasRecentHeartbeat = cluster.last_heartbeat_at &&
              new Date(cluster.last_heartbeat_at) > thirtyDaysAgo

            return hasValidKey && hasRecentHeartbeat
          })

          console.log(`Filtered to ${recentClusters.length} recent clusters (last 30 days, valid keys)`)

          // Deduplicate by cluster_key STRICTLY (the stable user-visible identifier)
          // This is the canonical identifier that should be unique per physical cluster
          const clustersByKey = new Map<string, any>()

          for (const cluster of recentClusters) {
            const primaryKey = cluster.cluster_key

            if (primaryKey && !clustersByKey.has(primaryKey)) {
              // Only take the first occurrence (most recent due to sort)
              clustersByKey.set(primaryKey, cluster)
            }
          }

          const uniqueLocalClusters = Array.from(clustersByKey.values())
          console.log(`Deduplicated to ${uniqueLocalClusters.length} unique local clusters`)
          console.log('Unique cluster keys:', uniqueLocalClusters.map(c => ({
            key: c.cluster_key,
            id: c.cluster_id,
            fingerprint: c.machine_fingerprint?.substring(0, 8)
          })))
          // Fetch license keys separately to avoid relationship syntax issues
          const licenseIds = uniqueLocalClusters
            .map(c => c.license_key_id)
            .filter(Boolean)

          let licenseData: any = {}
          if (licenseIds.length > 0) {
            const { data: licenses } = await dbOperations.supabaseAdmin
              .from('license_keys')
              .select('id, key_code, license_type, local_cluster_limits')
              .in('id', licenseIds)

            if (licenses) {
              licenseData = licenses.reduce((acc, lic) => {
                acc[lic.id] = lic
                return acc
              }, {} as any)
            }
          }

          centcomClusters = uniqueLocalClusters.map((cluster: any) => {
            const license = licenseData[cluster.license_key_id]
            return {
              id: cluster.cluster_id || cluster.id,
              cluster_key: cluster.cluster_key || `LOCAL-${cluster.machine_fingerprint?.substring(0, 4) || 'UNKNOWN'}`,
              name: cluster.cluster_name || `CentCom Local - ${cluster.machine_fingerprint?.substring(0, 8) || 'Unknown'}`,
              description: `Local ClickHouse cluster on ${cluster.machine_os}`,
              architecture: 'centcom',
              cluster_type: 'analytics',
              status: cluster.last_heartbeat_at &&
                (new Date().getTime() - new Date(cluster.last_heartbeat_at).getTime()) < 24 * 60 * 60 * 1000
                ? 'active' : 'offline',
              health_status: 'unknown',
              region: 'local',

              // CentCom-specific fields
              machine_fingerprint: cluster.machine_fingerprint,
              storage_used_gb: cluster.storage_used_gb,
              queries_this_month: cluster.queries_this_month,
              clickhouse_version: cluster.clickhouse_version,
              machine_os: cluster.machine_os,
              machine_memory_gb: cluster.machine_memory_gb,
              machine_cpu_cores: cluster.machine_cpu_cores,
              last_heartbeat_at: cluster.last_heartbeat_at,
              license_type: license?.license_type || 'unknown',
              offline_grace_days: license?.local_cluster_limits?.offline_grace_days || 30,

              // Billing
              estimated_monthly_cost: 0,
              pricing_model: 'free',
              responsible_user_id: user.id,

              // Timestamps
              created_at: cluster.created_at,
              updated_at: cluster.updated_at,
              user_role: 'owner'
            }
          })
        }
      } catch (centcomError) {
        console.error('Could not fetch CentCom clusters:', centcomError)
        // Continue without CentCom clusters if there's an error
      }

      const allClusters = [...transformedClusters, ...centcomClusters]

      return NextResponse.json({
        success: true,
        clusters: allClusters,
        total: allClusters.length,
        architecture_summary: {
          traditional: allClusters.filter(c => c.architecture === 'traditional').length,
          optimized: allClusters.filter(c => c.architecture === 'optimized').length,
          centcom: centcomClusters.length
        }
      })

    } catch (unifiedError) {
      console.log('Unified clusters table not found, falling back to empty state:', unifiedError.message)
      
      // Return empty state with setup instructions
      return NextResponse.json({
        success: true,
        clusters: [],
        total: 0,
        setup_required: true,
        message: 'Database setup required. Please run the unified cluster setup.',
        architecture_summary: {
          traditional: 0,
          optimized: 0
        }
      })
    }

  } catch (error) {
    console.error('Error in GET /api/clusters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}