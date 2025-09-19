import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client for server-side operations
const supabaseUrl = 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('GET /api/admin/onboarding/upcoming-sessions - Starting request...')
    
    // Get upcoming sessions (next 7 days)
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .in('status', ['scheduled', 'pending'])
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', sevenDaysFromNow.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(20)

    if (sessionsError) {
      console.error('Error fetching upcoming sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming sessions', details: sessionsError.message },
        { status: 500 }
      )
    }

    // Enrich sessions with user and license information
    const enrichedSessions = await Promise.all((sessions || []).map(async (session) => {
      // Fetch user profile
      let userProfile = null
      if (session.user_id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name, email')
          .eq('id', session.user_id)
          .single()
        userProfile = profile
      }

      // Fetch license information
      let licenseInfo = null
      if (session.license_key_id) {
        const { data: license } = await supabase
          .from('license_keys')
          .select('key_code, license_type')
          .eq('id', session.license_key_id)
          .single()
        licenseInfo = license
      }

      return {
        ...session,
        user_profiles: userProfile,
        license_keys: licenseInfo
      }
    }))

    // Also fetch overdue sessions (scheduled in the past but not completed)
    const { data: overdueSessions, error: overdueError } = await supabase
      .from('onboarding_sessions')
      .select('*')
      .in('status', ['scheduled', 'pending'])
      .not('scheduled_at', 'is', null)
      .lt('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(10)

    let enrichedOverdueSessions = []
    if (!overdueError && overdueSessions) {
      enrichedOverdueSessions = await Promise.all(overdueSessions.map(async (session) => {
        // Fetch user profile
        let userProfile = null
        if (session.user_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('full_name, email')
            .eq('id', session.user_id)
            .single()
          userProfile = profile
        }

        // Fetch license information
        let licenseInfo = null
        if (session.license_key_id) {
          const { data: license } = await supabase
            .from('license_keys')
            .select('key_code, license_type')
            .eq('id', session.license_key_id)
            .single()
          licenseInfo = license
        }

        return {
          ...session,
          user_profiles: userProfile,
          license_keys: licenseInfo,
          is_overdue: true
        }
      }))
    }

    console.log(`Found ${enrichedSessions.length} upcoming sessions and ${enrichedOverdueSessions.length} overdue sessions`)

    return NextResponse.json({
      sessions: [...enrichedOverdueSessions, ...enrichedSessions],
      upcoming_count: enrichedSessions.length,
      overdue_count: enrichedOverdueSessions.length,
      total_count: enrichedSessions.length + enrichedOverdueSessions.length
    })

  } catch (error) {
    console.error('Unexpected error in upcoming sessions API:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



