import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Add CSP headers for Stripe compatibility
  supabaseResponse.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com https://js.stripe.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.stripe.com https://maps.googleapis.com https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  )

  // Check if required environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey
    })
    // Return early for admin routes to prevent blocking
    if (request.nextUrl.pathname.startsWith('/admin')) {
      console.log('Middleware: Skipping Supabase client creation for admin route due to missing env vars')
      return supabaseResponse
    }
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // For API routes, we'll let the individual route handle authentication
  // but we need to refresh the session
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Refresh session if needed
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Middleware API route - Session check:', !!session)
    return supabaseResponse
  }

  // For admin routes, we'll be more permissive and let the individual pages handle auth
  // This prevents middleware from incorrectly redirecting authenticated users
  if (request.nextUrl.pathname.startsWith('/admin')) {
    console.log('Middleware admin route - Allowing access, auth handled by page')
    return supabaseResponse
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
