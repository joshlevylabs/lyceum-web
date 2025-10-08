import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get usage data with license info
    const { data: usage, error } = await supabase
      .from('local_cluster_usage')
      .select(`
        *,
        user:user_id (email),
        license:license_id (license_type, local_cluster_limits)
      `)

    if (error) throw error

    // Calculate tier distribution
    const tierCounts: Record<string, number> = {}
    const warnings: any[] = []
    
    usage?.forEach((u: any) => {
      const tier = u.license?.license_type || 'unknown'
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
      
      // Check for warnings
      const limits = u.license?.local_cluster_limits || {}
      const storagePercent = limits.max_storage_gb ? (u.storage_used_gb / limits.max_storage_gb) * 100 : 0
      const queryPercent = limits.max_monthly_queries ? (u.queries_this_month / limits.max_monthly_queries) * 100 : 0
      
      if (storagePercent >= 80 || queryPercent >= 80) {
        warnings.push({
          user_email: u.user?.email,
          license_type: tier,
          storage_percent: storagePercent,
          query_percent: queryPercent,
          max_percent: Math.max(storagePercent, queryPercent)
        })
      }
    })

    const totalUsers = usage?.length || 0
    const tierDistribution = Object.entries(tierCounts).map(([tier, count]) => ({
      tier,
      count,
      percentage: (count / totalUsers) * 100
    }))

    // Generate usage history (last 10 days)
    const usageHistory = Array.from({ length: 10 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      return {
        date: date.toISOString().split('T')[0],
        storage_gb: Math.random() * 100, // Mock data - replace with actual
        queries: Math.floor(Math.random() * 1000000),
        user_count: totalUsers
      }
    }).reverse()

    return NextResponse.json({
      success: true,
      usageHistory,
      tierDistribution,
      warningUsers: warnings.sort((a, b) => b.max_percent - a.max_percent).slice(0, 10)
    })
  } catch (error) {
    console.error('Error fetching usage analytics:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}




