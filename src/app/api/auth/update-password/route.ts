import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'

export async function POST(request: NextRequest) {
  try {
    const { access_token, new_password } = await request.json()

    console.log('Password update API called:', { 
      has_token: !!access_token, 
      has_password: !!new_password,
      token_length: access_token?.length,
      service_key_available: !!supabaseServiceKey,
      service_key_preview: supabaseServiceKey?.substring(0, 20) + '...'
    })

    if (!access_token || !new_password) {
      return NextResponse.json({
        success: false,
        error: 'Missing access_token or new_password'
      }, { status: 400 })
    }

    // Parse the JWT to get user info
    const tokenPayload = JSON.parse(atob(access_token.split('.')[1]))
    const userId = tokenPayload.sub
    
    console.log('Updating password for user:', { 
      user_id: userId, 
      email: tokenPayload.email 
    })

    // Use Supabase admin client to update password directly
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('About to update user password via admin API...')

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { password: new_password }
    )

    console.log('Password update result:', { error: updateError?.message })

    if (updateError) {
      console.error('Password update failed:', updateError)
      return NextResponse.json({
        success: false,
        error: `Password update failed: ${updateError.message}`
      }, { status: 400 })
    }

    console.log('Password updated successfully for user:', userId)

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    })

  } catch (error: any) {
    console.error('Password update API error:', error)
    return NextResponse.json({
      success: false,
      error: `Server error: ${error.message}`
    }, { status: 500 })
  }
}
