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

  // Handle CORS for Centcom and User API routes
  if (request.nextUrl.pathname.startsWith('/api/centcom/') ||
      request.nextUrl.pathname.startsWith('/api/user/') ||
      request.nextUrl.pathname.startsWith('/api/licenses/') ||
      request.nextUrl.pathname.startsWith('/api/admin/sessions/')) {

    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'http://localhost:3003',
      'http://localhost:3594',
      'tauri://localhost',
      'https://centcom.thelyceum.io',
      'https://www.thelyceum.io'
    ]

    // Check if this is a CORS preflight request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigins.includes(origin || '') ? origin! : '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Add CORS headers to actual requests
    supabaseResponse.headers.set(
      'Access-Control-Allow-Origin',
      allowedOrigins.includes(origin || '') ? origin! : '*'
    )
    supabaseResponse.headers.set('Access-Control-Allow-Credentials', 'true')
    supabaseResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    supabaseResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

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

  // Define protected routes that require email verification
  const protectedRoutes = ['/dashboard', '/profile', '/settings', '/onboarding', '/tickets', '/groups', '/clusters']
  const isProtectedRoute = protectedRoutes.some(route => request.nextUrl.pathname.startsWith(route))

  // Email verification enforcement for protected routes
  if (isProtectedRoute) {
    console.log(`Middleware: Checking protected route: ${request.nextUrl.pathname}`)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    console.log('Middleware: Session check result:', {
      hasSession: !!session,
      userId: session?.user?.id,
      sessionError: sessionError?.message
    })

    if (!session) {
      // Not authenticated - redirect to sign in
      console.log('Middleware: No session found, redirecting to signin')
      const redirectUrl = new URL('/auth/signin', request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Check if email is verified in user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('email_verified')
      .eq('id', session.user.id)
      .single()

    console.log('Middleware: Profile check result:', {
      hasProfile: !!profile,
      emailVerified: profile?.email_verified,
      profileError: profileError?.message
    })

    if (!profileError && profile && !profile.email_verified) {
      // Email not verified - redirect to verification page
      const redirectUrl = new URL('/auth/verify-email', request.url)
      console.log('Middleware: Redirecting unverified user to verification page')
      return NextResponse.redirect(redirectUrl)
    }
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
