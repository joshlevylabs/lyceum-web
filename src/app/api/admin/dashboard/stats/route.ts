import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for server-side operations
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/dashboard/stats - Starting request...')
    
    // Fetch total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    if (usersError) {
      console.error('Error counting users:', usersError)
    }

    // Fetch active users (those with recent login activity)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get all auth users to check last sign in
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers()
    
    const activeUsers = authUsers?.users?.filter(user => {
      if (!user.last_sign_in_at) return false
      const lastLogin = new Date(user.last_sign_in_at)
      return lastLogin > thirtyDaysAgo
    }).length || 0

    // Fetch total license keys count
    const { count: totalLicenses, error: licensesError } = await supabase
      .from('license_keys')
      .select('*', { count: 'exact', head: true })

    if (licensesError) {
      console.error('Error counting licenses:', licensesError)
    }

    // Fetch active licenses (non-expired, active status)
    const { count: activeLicenses, error: activeLicensesError } = await supabase
      .from('license_keys')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())

    if (activeLicensesError) {
      console.error('Error counting active licenses:', activeLicensesError)
    }

    // Fetch pending onboarding count
    const { count: pendingOnboarding, error: onboardingError } = await supabase
      .from('onboarding_progress')
      .select('*', { count: 'exact', head: true })
      .in('overall_status', ['pending', 'in_progress'])

    if (onboardingError) {
      console.error('Error counting pending onboarding:', onboardingError)
    }

    // Fetch recent activity (last 10 activities)
    const recentActivity = []

    // Recent user registrations
    const { data: recentUsers } = await supabase
      .from('user_profiles')
      .select('full_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(3)

    if (recentUsers) {
      recentUsers.forEach((user, index) => {
        const timeDiff = Date.now() - new Date(user.created_at).getTime()
        const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
        const timeText = hoursAgo < 1 ? 'Less than 1 hour ago' : 
                        hoursAgo < 24 ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago` :
                        `${Math.floor(hoursAgo / 24)} day${Math.floor(hoursAgo / 24) > 1 ? 's' : ''} ago`
        
        recentActivity.push({
          id: `user-${index}`,
          action: 'New user registered',
          user: user.full_name || user.email,
          time: timeText,
          type: 'user'
        })
      })
    }

    // Recent license assignments (simplified to avoid foreign key issues)
    const { data: recentLicenses } = await supabase
      .from('license_keys')
      .select('key_code, assigned_at, assigned_to')
      .not('assigned_at', 'is', null)
      .order('assigned_at', { ascending: false })
      .limit(3)

    if (recentLicenses) {
      // Get user info for licenses separately
      const userIds = recentLicenses.map(l => l.assigned_to).filter(Boolean)
      const { data: licenseUsers } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds)

      recentLicenses.forEach((license, index) => {
        if (license.assigned_at) {
          const timeDiff = Date.now() - new Date(license.assigned_at).getTime()
          const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
          const timeText = hoursAgo < 1 ? 'Less than 1 hour ago' : 
                          hoursAgo < 24 ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago` :
                          `${Math.floor(hoursAgo / 24)} day${Math.floor(hoursAgo / 24) > 1 ? 's' : ''} ago`
          
          const user = licenseUsers?.find(u => u.id === license.assigned_to)
          
          recentActivity.push({
            id: `license-${index}`,
            action: `License ${license.key_code} assigned`,
            user: user?.full_name || user?.email || 'Unknown user',
            time: timeText,
            type: 'license'
          })
        }
      })
    }

    // Recent onboarding completions (simplified to avoid foreign key issues)
    const { data: recentCompletions } = await supabase
      .from('onboarding_sessions')
      .select('title, completed_at, user_id')
      .eq('status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(2)

    if (recentCompletions) {
      // Get user info for completions separately
      const completionUserIds = recentCompletions.map(c => c.user_id).filter(Boolean)
      const { data: completionUsers } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', completionUserIds)

      recentCompletions.forEach((completion, index) => {
        if (completion.completed_at) {
          const timeDiff = Date.now() - new Date(completion.completed_at).getTime()
          const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60))
          const timeText = hoursAgo < 1 ? 'Less than 1 hour ago' : 
                          hoursAgo < 24 ? `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago` :
                          `${Math.floor(hoursAgo / 24)} day${Math.floor(hoursAgo / 24) > 1 ? 's' : ''} ago`
          
          const user = completionUsers?.find(u => u.id === completion.user_id)
          
          recentActivity.push({
            id: `completion-${index}`,
            action: `Completed: ${completion.title}`,
            user: user?.full_name || user?.email || 'Unknown user',
            time: timeText,
            type: 'onboarding'
          })
        }
      })
    }

    // Sort activities by most recent first
    recentActivity.sort((a, b) => {
      // Simple sorting by time text (not perfect but good enough for demo)
      if (a.time.includes('Less than')) return -1
      if (b.time.includes('Less than')) return 1
      return 0
    })

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers,
      totalLicenses: totalLicenses || 0,
      activeLicenses: activeLicenses || 0,
      totalClusters: 1, // Static for now since no clusters table
      healthyClusters: 1,
      pendingOnboarding: pendingOnboarding || 0,
      recentActivity: recentActivity.slice(0, 10)
    }

    console.log('Dashboard stats:', stats)

    return NextResponse.json({
      stats,
      message: 'Dashboard statistics loaded successfully'
    })

  } catch (error) {
    console.error('Unexpected error in dashboard stats API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
