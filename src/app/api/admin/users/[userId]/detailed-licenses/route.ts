import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateFlexiblePricing, getCurrentUsage } from '@/lib/flexible-pricing'

/**
 * Get detailed license information for a specific user (admin only)
 * GET /api/admin/users/[userId]/detailed-licenses
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    console.log('🔍 Getting detailed licenses and complete billing data for user:', userId)
    
    // Get real user data from the proper billing service (not mock data)
    const { data: realUserLicenses, error: realLicenseError } = await supabase
      .from('license_keys')
      .select('license_type, status, responsible_user_id')
      .eq('responsible_user_id', userId)
      .eq('status', 'active')
      .neq('license_type', 'gratis')

    if (realLicenseError) {
      console.error('Error fetching real user licenses:', realLicenseError)
    }

    // Get real cluster data
    const { data: realUserClusters, error: realClusterError } = await supabase
      .from('user_database_clusters')
      .select('cluster_type, status, storage_size_mb, cpu_cores, ram_mb')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (realClusterError) {
      console.error('Error fetching real user clusters:', realClusterError)
    }

    // Get real storage usage
    const { data: realStorageUsage, error: storageError } = await supabase
      .from('user_resource_usage')
      .select('storage_used_mb, storage_limit_mb')
      .eq('user_id', userId)
      .single()

    if (storageError) {
      console.warn('No storage usage data found:', storageError)
    }

    // Calculate REAL usage based on actual user data
    const realUsage = {
      licenses: getLicenseBreakdown(realUserLicenses || []),
      clusters: getClusterBreakdown(realUserClusters || []),
      additionalUsers: 0, // TODO: Calculate real additional users
      storageOverageGB: calculateStorageOverage(realStorageUsage)
    }

    console.log('📊 REAL user usage (not mock data):', realUsage)
    
    const { lineItems, totalAmount, summary } = calculateFlexiblePricing({
      userId: userId,
      ...realUsage
    })
    console.log('💰 Calculated pricing from REAL data:', { lineItems, totalAmount, summary })

    // Get detailed license information for UI display
    const { data: allUserLicenses, error: licenseError } = await supabase
      .from('license_keys')
      .select('*')
      .eq('assigned_to', userId)

    if (licenseError) {
      console.error('Error fetching user licenses:', licenseError)
    }

    // Get responsible user information
    const responsibleUserIds = [...new Set((allUserLicenses || []).filter(l => l.responsible_user_id).map(l => l.responsible_user_id))]
    let responsibleUsers = []
    
    if (responsibleUserIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('user_profiles')
        .select('id, email, full_name')
        .in('id', responsibleUserIds)
      
      if (!usersError && users) {
        responsibleUsers = users
      }
    }

    // Process detailed license information for UI
    const processedLicenses = (allUserLicenses || []).map(license => {
      const responsibleUser = responsibleUsers.find(u => u.id === license.responsible_user_id)
      return {
        id: license.id,
        key_code: license.key_code,
        license_type: license.license_type,
        status: license.status,
        max_users: license.max_users,
        max_projects: license.max_projects,
        max_storage_gb: license.max_storage_gb,
        features: license.features || [],
        expires_at: license.expires_at,
        assigned_at: license.assigned_at,
        created_at: license.created_at,
        assigned_via: 'direct_assignment',
        responsible_user: responsibleUser,
        is_billable: license.status === 'active' && license.license_type !== 'gratis' && license.license_type !== 'trial',
        monthly_cost: 0, // Will be calculated from billing service data
        is_user_responsible: license.responsible_user_id === userId
      }
    })

    // Extract license and cluster costs from billing service calculation
    const licenseLineItems = lineItems.filter(item => 
      item.name.toLowerCase().includes('license') || 
      item.description.toLowerCase().includes('license')
    )
    const clusterLineItems = lineItems.filter(item => 
      item.name.toLowerCase().includes('cluster') || 
      item.description.toLowerCase().includes('cluster')
    )

    const totalLicenseCost = licenseLineItems.reduce((sum, item) => sum + item.totalPrice, 0) / 100
    const totalClusterCost = clusterLineItems.reduce((sum, item) => sum + item.totalPrice, 0) / 100
    const totalMonthlyCost = totalAmount / 100

    const categorized = {
      all_licenses: processedLicenses,
      billable_licenses: processedLicenses.filter(license => license.is_billable),
      user_responsible_licenses: processedLicenses.filter(license => license.is_user_responsible && license.is_billable),
      gratis_licenses: processedLicenses.filter(license => license.license_type === 'gratis'),
      trial_licenses: processedLicenses.filter(license => license.license_type === 'trial'),
      inactive_licenses: processedLicenses.filter(license => license.status !== 'active'),
      billing_line_items: lineItems,
      license_line_items: licenseLineItems,
      cluster_line_items: clusterLineItems
    }

    const billing_summary = {
      total_licenses: processedLicenses.length,
      billable_licenses_count: categorized.billable_licenses.length,
      user_responsible_count: categorized.user_responsible_licenses.length,
      total_clusters: realUsage.clusters.reduce((sum, cluster) => sum + cluster.quantity, 0),
      billable_clusters_count: realUsage.clusters.reduce((sum, cluster) => sum + cluster.quantity, 0),
      license_monthly_cost: totalLicenseCost,
      cluster_monthly_cost: totalClusterCost,
      total_monthly_cost: totalMonthlyCost,
      gratis_count: categorized.gratis_licenses.length,
      trial_count: categorized.trial_licenses.length,
      inactive_count: categorized.inactive_licenses.length,
      inactive_clusters_count: 0,
      // Include full billing breakdown for complete transparency (REAL data, not mock)
      estimated_cost_breakdown: {
        total_dollars: totalAmount / 100,
        line_items: lineItems.map(item => ({
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price_dollars: item.unitPrice / 100,
          total_price_dollars: item.totalPrice / 100,
          category: getCostCategory(item.name)
        })),
        summary
      },
      // Raw usage data for debugging (REAL data)
      raw_usage: realUsage,
      real_licenses_count: realUserLicenses?.length || 0,
      real_clusters_count: realUserClusters?.length || 0,
      real_storage_used_mb: realStorageUsage?.storage_used_mb || 0
    }

// Helper functions for real data calculation
function getLicenseBreakdown(licenses: any[]): Array<{ type: string; quantity: number }> {
  const counts: Record<string, number> = {}
  
  licenses.forEach(license => {
    // Map license types to billing categories
    let billingType = license.license_type
    if (billingType === 'enterprise') billingType = 'professional' // Map enterprise to professional billing
    if (billingType === 'standard') billingType = 'basic' // Map standard to basic billing
    
    counts[billingType] = (counts[billingType] || 0) + 1
  })
  
  return Object.entries(counts).map(([type, quantity]) => ({ type, quantity }))
}

function getClusterBreakdown(clusters: any[]): Array<{ size: string; type: string; quantity: number; pricing_model?: string; estimated_cost?: number }> {
  const breakdown: Array<{ size: string; type: string; quantity: number; pricing_model?: string; estimated_cost?: number }> = []
  const counts: Record<string, Record<string, { quantity: number; gratis: number; paid: number }>> = {}
  
  clusters.forEach(cluster => {
    // Skip free/gratis clusters from billing calculations
    if (cluster.pricing_model === 'free' || cluster.estimated_monthly_cost === 0) {
      return // Don't include in billable breakdown
    }
    
    // Determine cluster size based on resources
    let size = 'small'
    if (cluster.cpu_cores >= 8 || cluster.ram_mb >= 16384) {
      size = 'large'
    } else if (cluster.cpu_cores >= 4 || cluster.ram_mb >= 8192) {
      size = 'medium'
    }
    
    // Map cluster type
    let type = 'development'
    if (cluster.cluster_type === 'production') type = 'production'
    if (cluster.cluster_type === 'analytics') type = 'analytics'
    
    if (!counts[size]) counts[size] = {}
    if (!counts[size][type]) counts[size][type] = { quantity: 0, gratis: 0, paid: 0 }
    
    if (cluster.pricing_model === 'free') {
      counts[size][type].gratis += 1
    } else {
      counts[size][type].quantity += 1
      counts[size][type].paid += 1
    }
  })
  
  Object.entries(counts).forEach(([size, types]) => {
    Object.entries(types).forEach(([type, counts]) => {
      if (counts.quantity > 0) { // Only add paid clusters to billing
        breakdown.push({ 
          size, 
          type, 
          quantity: counts.quantity,
          pricing_model: 'paid'
        })
      }
    })
  })
  
  return breakdown
}

function calculateStorageOverage(storageUsage: any): number {
  if (!storageUsage) return 0
  
  const usedMB = storageUsage.storage_used_mb || 0
  const limitMB = storageUsage.storage_limit_mb || 1024 // 1GB default
  const overageGB = Math.max(0, (usedMB - limitMB) / 1024)
  
  return Math.round(overageGB * 100) / 100 // Round to 2 decimals
}

function getCostCategory(itemName: string): string {
  if (itemName.toLowerCase().includes('platform') || itemName.toLowerCase().includes('base')) {
    return 'Platform'
  }
  if (itemName.toLowerCase().includes('license')) {
    return 'Licenses'
  }
  if (itemName.toLowerCase().includes('cluster')) {
    return 'Clusters'
  }
  if (itemName.toLowerCase().includes('user')) {
    return 'Additional Services'
  }
  if (itemName.toLowerCase().includes('storage')) {
    return 'Additional Services'
  }
  return 'Other'
}

    console.log('📊 Complete billing summary:', billing_summary)

    return NextResponse.json({
      success: true,
      data: {
        licenses: categorized,
        billing_summary
      }
    })

  } catch (error: any) {
    console.error('Error in detailed licenses API:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}
