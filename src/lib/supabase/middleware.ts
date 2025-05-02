import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware helper for Supabase authentication
 * This function refreshes the user's session and updates cookies
 * following Supabase's recommended pattern
 */
export async function updateSession(request: NextRequest) {
  // Create a response object that we'll modify and return
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase client specifically for handling auth in the middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)?.value
          return cookie
        },
        set(name: string, value: string, options: any) {
          // Only set cookies if we're in a Vercel environment or production
          if (request.headers.get('host')?.includes('vercel.app') || process.env.NODE_ENV === 'production') {
            // For Vercel deployments, we need to ensure the cookie domain is appropriate
            response.cookies.set({
              name,
              value,
              ...options,
              // Don't use domain-specific cookies for Vercel deployments
              domain: undefined,
              sameSite: 'lax',
              path: '/'
            })
          } else {
            // For local development
            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: 'lax',
              path: '/'
            })
          }
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            maxAge: 0,
          })
        },
      },
    }
  )

  // This gets the session using the cookies and updates cookies if needed
  const { data: { session } } = await supabase.auth.getUser()
  
  // Log status for debugging
  const pathname = request.nextUrl.pathname
  if (session) {
    console.log(`[Middleware] Session found for user ${session.user.id.slice(0, 6)}... on ${pathname}`)
  } else {
    console.log(`[Middleware] No session found for path ${pathname}`)
    
    // If requesting a protected route, redirect to login
    if (pathname.startsWith('/dashboard') || 
        pathname.startsWith('/profile') ||
        pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
  }

  return response
}

/**
 * Helper function to determine if a route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/company-selection') ||
    pathname.startsWith('/waiting-approval') ||
    pathname.startsWith('/api/') // API routes are also protected
  )
} 