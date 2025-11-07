import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { emailVerificationTemplate } from '@/lib/email-templates'

/**
 * Send verification email to new user
 * POST /api/send-verification-email
 * Body: { email: string, userId: string, userName?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, userId, userName } = body

    if (!email || !userId) {
      return NextResponse.json(
        { error: 'Email and userId are required' },
        { status: 400 }
      )
    }

    console.log('Generating verification link for new user:', email)

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Generate a magic link for email verification
    // This automatically signs the user in when they click it
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thelyceum.io'}/auth/callback`,
      }
    })

    if (linkError) {
      console.error('Link generation error:', linkError)
      return NextResponse.json(
        { error: `Failed to generate verification link: ${linkError.message}` },
        { status: 500 }
      )
    }

    if (!linkData?.properties?.action_link) {
      console.error('No action link in response')
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      )
    }

    console.log('Verification link generated successfully')

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY!)

    // Send email via Resend with magic link and beautiful template
    const verificationLink = linkData.properties.action_link
    const displayName = userName || email.split('@')[0] || 'there'

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Lyceum <noreply@thelyceum.io>',
      to: [email],
      subject: 'Verify your email address - Lyceum',
      html: emailVerificationTemplate(verificationLink, displayName)
    })

    if (emailError) {
      console.error('Resend email error:', emailError)
      return NextResponse.json(
        { error: `Failed to send email: ${emailError.message}` },
        { status: 500 }
      )
    }

    console.log('Verification email sent successfully via Resend:', {
      emailId: emailData?.id,
      to: email
    })

    return NextResponse.json({
      success: true,
      emailId: emailData?.id
    })
  } catch (error: any) {
    console.error('Send verification email error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send verification email' },
      { status: 500 }
    )
  }
}
