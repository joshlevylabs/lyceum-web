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

    console.log('Generating password reset link for:', {
      user_id,
      email,
      user_confirmed: authUser.user.email_confirmed_at,
      user_email: authUser.user.email
    })

    // Generate recovery link (this method bypasses rate limiting)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3594'}/auth/callback`
      }
    })

    if (linkError) {
      console.error('Generate link error:', linkError)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to generate reset link: ${linkError.message}` 
      }, { status: 400 })
    }

    const resetLink = linkData?.properties?.action_link
    if (!resetLink) {
      return NextResponse.json({ 
        success: false, 
        error: 'No reset link generated' 
      }, { status: 400 })
    }

    console.log('Generated recovery link:', resetLink)

    // Log the password reset request for audit purposes
    try {
      await supabase
        .from('user_activity_log')
        .insert({
          user_id: user_id,
          action: 'password_reset_link_generated',
          details: {
            initiated_by: 'admin',
            email: email,
            method: 'generate_link',
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
      message: 'Password reset link generated successfully',
      reset_link: resetLink,
      email: email,
      user_id: user_id,
      generated_at: new Date().toISOString(),
      instructions: 'Send this link directly to the user. It bypasses email delivery and rate limiting.',
      expires_in: '1 hour'
    })

  } catch (error: any) {
    console.error('Generate reset link API error:', error)
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
