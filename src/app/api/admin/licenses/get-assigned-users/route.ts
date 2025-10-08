import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Get all users assigned to a specific license
 * GET /api/admin/licenses/get-assigned-users?license_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const licenseId = searchParams.get('license_id')

    if (!licenseId) {
      return NextResponse.json({ 
        success: false, 
        error: 'license_id parameter is required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Check if user_license_assignments table exists and has data
    const { data: assignments, error: assignmentsError } = await supabase
      .from('user_license_assignments')
      .select(`
        user_id,
        assigned_at,
        user_profiles (
          id,
          email,
          full_name,
          username
        )
      `)
      .eq('license_id', licenseId)
      .is('revoked_at', null)

    let assignedUsers = []

    if (!assignmentsError && assignments && assignments.length > 0) {
      // Use many-to-many assignments
      assignedUsers = assignments.map(assignment => ({
        id: assignment.user_id,
        email: assignment.user_profiles?.email,
        full_name: assignment.user_profiles?.full_name,
        username: assignment.user_profiles?.username,
        assigned_at: assignment.assigned_at
      }))
    } else {
      // Fallback: check both license tables for single assignment
      
      // First check licenses table
      const { data: license, error: licenseError } = await supabase
        .from('licenses')
        .select(`
          user_id,
          assigned_at,
          user_profiles (
            id,
            email,
            full_name,
            username
          )
        `)
        .eq('id', licenseId)
        .single()

      if (license && license.user_id) {
        assignedUsers = [{
          id: license.user_id,
          email: license.user_profiles?.email,
          full_name: license.user_profiles?.full_name,
          username: license.user_profiles?.username,
          assigned_at: license.assigned_at
        }]
      } else {
        // Check license_keys table
        const { data: licenseKey, error: licenseKeyError } = await supabase
          .from('license_keys')
          .select(`
            assigned_to,
            assigned_at
          `)
          .eq('id', licenseId)
          .single()

        if (licenseKey && licenseKey.assigned_to) {
          // Get user profile
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, email, full_name, username')
            .eq('id', licenseKey.assigned_to)
            .single()

          if (userProfile) {
            assignedUsers = [{
              id: licenseKey.assigned_to,
              email: userProfile.email,
              full_name: userProfile.full_name,
              username: userProfile.username,
              assigned_at: licenseKey.assigned_at
            }]
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      assigned_users: assignedUsers,
      count: assignedUsers.length
    })

  } catch (error: any) {
    console.error('Error getting assigned users:', error)
    return NextResponse.json({
      success: false,
      error: error?.message || 'Internal server error'
    }, { status: 500 })
  }
}

