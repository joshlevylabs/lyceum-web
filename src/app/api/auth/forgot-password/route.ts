import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { passwordResetTemplate } from '@/lib/email-templates'

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Use admin generateLink to generate password reset link
    console.log('Generating password reset link via admin API...')
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thelyceum.io'}/auth/callback`
      }
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('generateLink failed:', linkError)
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link shortly.',
        debug_note: 'Password reset attempted but email sending may have failed. Contact administrator if you don\'t receive the email.'
      })
    }

    console.log('Generated recovery link successfully')

    // Send email via Resend SDK with beautiful template
    const resetLink = linkData.properties.action_link
    const userName = user.user_metadata?.full_name || user.user_metadata?.user_name || user.email?.split('@')[0] || 'there'

    const resend = new Resend(process.env.RESEND_API_KEY!)

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Lyceum <noreply@thelyceum.io>',
      to: [email],
      subject: 'Reset your password - Lyceum',
      html: passwordResetTemplate(resetLink, userName)
    })

    if (emailError) {
      console.error('Resend email error:', emailError)
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, you will receive a password reset link shortly.',
        debug_note: 'Email sending failed. Please contact support.'
      })
    }

    console.log('Password reset email sent successfully via Resend:', {
      emailId: emailData?.id,
      to: email
    })

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
      sent_at: new Date().toISOString(),
      emailId: emailData?.id
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
