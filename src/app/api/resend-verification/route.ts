import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST() {
  try {
    const cookieStore = await cookies()

    // Regular Supabase client to get current user
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          },
        },
      }
    )

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    console.log('API: Getting user:', {
      hasUser: !!user,
      email: user?.email,
      userError: userError?.message
    })

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('API: Generating verification link for existing user:', user.email)

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

    // For existing users, generate a magic link which works for both new and existing users
    // This will sign them in and we'll mark them as verified on callback
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thelyceum.io'}/auth/callback`,
      }
    })

    if (linkError) {
      console.error('API: Link generation error:', linkError)
      return NextResponse.json(
        { error: `Failed to generate verification link: ${linkError.message}` },
        { status: 500 }
      )
    }

    if (!linkData?.properties?.action_link) {
      console.error('API: No action link in response')
      return NextResponse.json(
        { error: 'Failed to generate verification link' },
        { status: 500 }
      )
    }

    console.log('API: Verification link generated successfully')

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY!)

    // Send email via Resend with magic link
    const verificationLink = linkData.properties.action_link

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Lyceum <noreply@thelyceum.io>',
      to: [user.email!],
      subject: 'Verify your email address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Verify Your Email</h1>
            </div>
            <div class="content">
              <p>Thank you for signing up for Lyceum!</p>
              <p>Please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationLink}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; font-size: 12px; color: #6b7280;">${verificationLink}</p>
              <p>This link will expire in 24 hours.</p>
              <p>If you didn't create an account with Lyceum, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Lyceum. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    })

    if (emailError) {
      console.error('API: Resend email error:', emailError)
      return NextResponse.json(
        { error: `Failed to send email: ${emailError.message}` },
        { status: 500 }
      )
    }

    console.log('API: Verification email sent successfully via Resend:', {
      emailId: emailData?.id,
      to: user.email
    })

    return NextResponse.json({
      success: true,
      emailId: emailData?.id
    })
  } catch (error: any) {
    console.error('API: Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resend email' },
      { status: 500 }
    )
  }
}
