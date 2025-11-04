import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const cookieStore = await cookies()

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

    console.log('API: Resending verification email to:', user.email)

    // Resend the verification email
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: user.email!,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.thelyceum.io'}/auth/callback`,
      }
    })

    if (resendError) {
      console.error('API: Resend error:', resendError)
      return NextResponse.json(
        { error: resendError.message },
        { status: 400 }
      )
    }

    console.log('API: Verification email sent successfully')
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API: Exception:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to resend email' },
      { status: 500 }
    )
  }
}
