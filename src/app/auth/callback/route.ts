import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data?.user) {
      // Update user_profiles to mark email as verified
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ email_verified: true })
        .eq('id', data.user.id)

      if (updateError) {
        console.error('Error updating email_verified status:', updateError)
      }

      // Redirect to dashboard after successful verification
      return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
    }
  }

  // If there's an error or no code, redirect to sign in
  return NextResponse.redirect(new URL('/auth/signin?error=verification_failed', requestUrl.origin))
}
