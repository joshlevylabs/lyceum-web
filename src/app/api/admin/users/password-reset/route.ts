import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { user_id, email } = body

    if (!user_id || !email) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and email are required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // Verify the user exists
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserById(user_id)
    
    if (userError || !authUser.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 })
    }

    // Debug: Log user information
    console.log('Password reset request:', {
      user_id,
      email,
      user_confirmed: authUser.user.email_confirmed_at,
      user_email: authUser.user.email
    })

    // Check if user's email is confirmed
    if (!authUser.user.email_confirmed_at) {
      console.warn('User email not confirmed:', email)
      // We'll still try to send, but note this issue
    }

    // Try multiple methods for sending password reset

    // Method 1: Generate recovery link (for debugging)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/callback`
      }
    })

    if (linkError) {
      console.error('Generate link error:', linkError)
    } else {
      console.log('Generated recovery link:', linkData?.properties?.action_link)
    }

    // Method 2: Send password reset email directly
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/set-password`
    })

    if (resetError) {
      console.error('Password reset error:', resetError)
      
      // Try Method 3: Admin invite (as fallback)
      console.log('Trying alternative method: admin invite...')
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/callback`,
        data: {
          password_reset_requested: true,
          reset_initiated_by: 'admin'
        }
      })

      if (inviteError) {
        console.error('All password reset methods failed:', { resetError, inviteError })
        return NextResponse.json({ 
          success: false, 
          error: `Failed to send password reset email. Reset error: ${resetError.message}. Invite error: ${inviteError.message}`,
          debug_info: {
            user_confirmed: !!authUser.user.email_confirmed_at,
            generated_link: !!linkData?.properties?.action_link,
            methods_tried: ['generateLink', 'resetPasswordForEmail', 'inviteUserByEmail']
          }
        }, { status: 400 })
      } else {
        console.log('Password reset sent via admin invite method')
      }
    } else {
      console.log('Password reset sent via resetPasswordForEmail method')
    }

    // Log the password reset request for audit purposes
    try {
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user_id,
          action: 'password_reset_initiated',
          details: {
            initiated_by: 'admin',
            email: email,
            timestamp: new Date().toISOString()
          },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        })
    } catch (logError) {
      console.warn('Failed to log password reset activity:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Password reset email sent successfully',
      email: email,
      user_id: user_id,
      sent_at: new Date().toISOString(),
      debug_info: {
        user_confirmed: !!authUser.user.email_confirmed_at,
        generated_link: !!linkData?.properties?.action_link,
        reset_method_used: resetError ? 'admin_invite' : 'reset_password_for_email',
        redirect_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/set-password`
      }
    })

  } catch (error: any) {
    console.error('Password reset API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
