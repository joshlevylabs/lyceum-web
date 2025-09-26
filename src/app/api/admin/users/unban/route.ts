import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, email } = body
    
    console.log('Unban user request:', { user_id, email })
    
    if (!user_id && !email) {
      return NextResponse.json({ success: false, error: 'user_id or email required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    let resolvedUserId = user_id
    
    // Get user ID from email if not provided
    if (!resolvedUserId && email) {
      const { data: user, error: userError } = await supabase.auth.admin.listUsers()
      if (userError) {
        console.error('Error listing users:', userError)
        return NextResponse.json({ success: false, error: `Failed to find user: ${userError.message}` }, { status: 400 })
      }
      
      const foundUser = user.users.find(u => u.email === email)
      if (!foundUser) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
      }
      
      resolvedUserId = foundUser.id
    }

    console.log('Attempting to unban user:', resolvedUserId)

    // Remove ban by updating the user
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(resolvedUserId, {
      ban_duration: 'none'
    })
    
    if (updateError) {
      console.error('Error unbanning user:', updateError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to unban user: ${updateError.message}` 
      }, { status: 400 })
    }

    console.log('User unbanned successfully:', updatedUser.user?.email)

    return NextResponse.json({ 
      success: true, 
      message: 'User unbanned successfully',
      user: {
        id: updatedUser.user?.id,
        email: updatedUser.user?.email,
        banned_until: updatedUser.user?.banned_until
      }
    })
    
  } catch (e: any) {
    console.error('Unexpected error in user unban:', e)
    return NextResponse.json({ 
      success: false, 
      error: e?.message || 'Internal error' 
    }, { status: 500 })
  }
}





