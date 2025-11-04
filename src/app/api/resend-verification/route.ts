import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { emailVerificationTemplate } from '@/lib/email-templates'

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

    // Send email via Resend with magic link and beautiful template
    const verificationLink = linkData.properties.action_link

    // Get user's name from user metadata if available
    const userName = user.user_metadata?.full_name || user.user_metadata?.user_name || user.email?.split('@')[0] || 'there'

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'Lyceum <noreply@thelyceum.io>',
      to: [user.email!],
      subject: 'Verify your email address - Lyceum',
      html: emailVerificationTemplate(verificationLink, userName)
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
