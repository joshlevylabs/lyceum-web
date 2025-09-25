import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    console.log('User-initiated password reset request:', { email })

    if (!email) {
      return NextResponse.json({ 
        success: false, 
        error: 'Email address is required' 
      }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kffiaqsihldgqdwagook.supabase.co'
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmZmlhcXNpaGxkZ3Fkd2Fnb29rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg5NTQxNiwiZXhwIjoyMDY4NDcxNDE2fQ.rdpMb817paWLCcJXzWuONBJgDU-RLDs45H33rgrvAE4'
    const supabase = createClient(supabaseUrl, serviceKey)

    // First check if user exists
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Failed to list users:', listError)
      // Don't reveal whether user exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with that email exists, you will receive a password reset link shortly.'
      })
    }

    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.log('User not found for password reset:', email)
      // Don't reveal whether user exists or not for security
      return NextResponse.json({ 
        success: true, 
        message: 'If an account with that email exists, you will receive a password reset link shortly.'
      })
    }

    console.log('Found user for password reset:', { user_id: user.id, email })

    // Try multiple methods for sending password reset

    // Method 1: Standard password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/callback`
    })

    if (resetError) {
      console.error('resetPasswordForEmail failed:', resetError)
      
      // Method 2: Use admin generateLink as fallback (rate-limit free)
      console.log('Trying generateLink method as fallback...')
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/callback`
        }
      })

      if (linkError) {
        console.error('generateLink also failed:', linkError)
        // Still return success for security (don't reveal internal errors)
        return NextResponse.json({ 
          success: true, 
          message: 'If an account with that email exists, you will receive a password reset link shortly.',
          debug_note: 'Password reset attempted but email sending may have failed. Contact administrator if you don\'t receive the email.'
        })
      } else {
        console.log('Generated recovery link as fallback:', linkData?.properties?.action_link)
        // Log the link for admin to manually send if needed
        console.log('ADMIN NOTE: Manual password reset link for', email, ':', linkData?.properties?.action_link)
      }
    } else {
      console.log('Password reset email sent successfully via resetPasswordForEmail')
    }

    // Log the password reset request for audit purposes
    try {
      await supabase
        .from('auth_logs')
        .insert({
          user_id: user.id,
          event_type: 'password_reset_requested',
          app_id: 'lyceum_web',
          client_info: {
            user_agent: req.headers.get('user-agent') || 'unknown',
            initiated_by: 'user_self_service'
          },
          ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
          success: true
        })
    } catch (logError) {
      console.warn('Failed to log password reset activity:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'If an account with that email exists, you will receive a password reset link shortly.',
      email: email,
      sent_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('User password reset API error:', error)
    // Don't reveal internal errors to users for security
    return NextResponse.json({ 
      success: true, 
      message: 'If an account with that email exists, you will receive a password reset link shortly.'
    })
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
