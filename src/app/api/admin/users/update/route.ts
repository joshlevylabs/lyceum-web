import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, email, full_name, username, company, is_active, role } = body
    
    console.log('User update request:', { user_id, is_active, role, full_name, username, company })
    
    if (!user_id && !email) {
      return NextResponse.json({ success: false, error: 'user_id or email required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    let resolvedEmail = email as string | null

    // Resolve email if only user_id provided
    if (!resolvedEmail && user_id) {
      const { data, error } = await supabase.auth.admin.getUserById(user_id)
      if (error) {
        console.error('getUserById error:', error)
        return NextResponse.json({ success: false, error: `admin.getUserById failed: ${error.message}` }, { status: 400 })
      }
      resolvedEmail = data?.user?.email || null
      if (!resolvedEmail) {
        return NextResponse.json({ success: false, error: 'Email not found for user_id' }, { status: 400 })
      }
    }

    // Handle user status updates - use profile-based deactivation instead of auth bans
    // This allows admins to "deactivate" users without preventing their login entirely

    // Update profile data (including is_active status)
    const profileUpdateData: any = { id: user_id, email: resolvedEmail }
    let hasProfileUpdates = false
    
    if (full_name !== undefined) {
      profileUpdateData.full_name = full_name
      hasProfileUpdates = true
    }
    if (username !== undefined) {
      profileUpdateData.username = username
      hasProfileUpdates = true
    }
    if (company !== undefined) {
      profileUpdateData.company = company
      hasProfileUpdates = true
    }
    if (role !== undefined) {
      profileUpdateData.role = role
      hasProfileUpdates = true
    }
    if (is_active !== undefined) {
      profileUpdateData.is_active = is_active
      hasProfileUpdates = true
      console.log(`Setting user ${user_id} is_active to:`, is_active)
    }

    let profile = null
    if (hasProfileUpdates) {
      const { data: profileData, error: upsertError } = await supabase
        .from('user_profiles')
        .upsert([profileUpdateData], { onConflict: 'id' })
        .select('*')
        .single()

      if (upsertError) {
        console.error('Profile upsert error:', upsertError)
        return NextResponse.json({ 
          success: false, 
          error: upsertError.message, 
          code: upsertError.code 
        }, { status: 400 })
      }
      profile = profileData
    }

    console.log('User update completed successfully')
    return NextResponse.json({ 
      success: true, 
      profile,
      message: 'User updated successfully'
    })
    
  } catch (e: any) {
    console.error('Unexpected error in user update:', e)
    return NextResponse.json({ 
      success: false, 
      error: e?.message || 'Internal error' 
    }, { status: 500 })
  }
}
