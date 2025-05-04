import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware helper for Supabase authentication
 * This function refreshes the user's session and updates cookies
 * following Supabase's recommended pattern
 */
export async function updateSession(request: NextRequest) {
  try {
    // Create a response object that we'll modify and return
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in middleware')
      return response
    }

    const requestUrl = new URL(request.url)
    const pathname = requestUrl.pathname

    // Special case: Skip auth for auth-related routes
    if (
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/magic-link') ||
      pathname.startsWith('/forgot-password')
    ) {
      console.log(`[Middleware] Skipping auth check for auth route: ${pathname}`)
      return response
    }

    // Debug cookies
    const allCookies = request.cookies.getAll()
    const cookieNames = allCookies.map(c => c.name)
    const hasSbAuthCookie = cookieNames.some(name => name.includes('auth-token'))
    console.log(`[Middleware] Cookies for ${pathname}: count=${allCookies.length}, hasAuthCookie=${hasSbAuthCookie}`)

    // Create a Supabase client specifically for handling auth in the middleware
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            const cookie = request.cookies.get(name)?.value
            console.log(`[Middleware] Reading cookie: ${name} = ${cookie ? 'present' : 'not found'}`)
            return cookie || null
          },
          set(name: string, value: string, options: any) {
            // Set the cookie on the response
            console.log(`[Middleware] Setting cookie: ${name}`)
            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: 'lax',
              path: '/',
              secure: process.env.NODE_ENV === 'production'
            })
          },
          remove(name: string, options: any) {
            console.log(`[Middleware] Removing cookie: ${name}`)
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: '/',
            })
          },
        },
      }
    )

    // CRITICAL: This is the key part - we need to get the user from Supabase
    // using getUser() rather than getSession() to ensure the token is validated
    // and refreshed if needed
    const { data, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error(`[Middleware] Error getting user: ${error.message}`)
      
      // Check if the error is due to an expired token
      const isExpiredTokenError = error.message.includes('expired') || 
                                error.message.includes('JWT') || 
                                error.message.includes('token');
      
      // Try to refresh the session on token expiration
      if (isExpiredTokenError && hasSbAuthCookie) {
        try {
          console.log(`[Middleware] Attempting to refresh expired token`);
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error(`[Middleware] Failed to refresh token: ${refreshError.message}`);
          } else if (refreshData?.session) {
            console.log(`[Middleware] Successfully refreshed token`);
            
            // If refresh succeeded for a protected route, allow the request to continue
            if (isProtectedRoute(pathname)) {
              return response;
            }
          }
        } catch (refreshException) {
          console.error(`[Middleware] Exception during token refresh: ${refreshException}`);
        }
      }
      
      // For protected routes, redirect to login on error
      if (isProtectedRoute(pathname)) {
        console.log(`[Middleware] Redirecting to sign-in due to auth error on protected route: ${pathname}`);
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }
      
      return response
    }
    
    const user = data?.user
    
    if (user) {
      console.log(`[Middleware] Session found for user ${user.id.slice(0, 6)}... on ${pathname}`)
      
      // CRITICAL: For requests that come from the browser, we need to refresh the session
      // This will update the auth tokens and set cookies with the latest values
      if (!request.headers.get('authorization')) {
        const { error: refreshError } = await supabase.auth.refreshSession()
        if (refreshError) {
          console.error(`[Middleware] Error refreshing session: ${refreshError.message}`)
        }
      }
    } else {
      console.log(`[Middleware] No session found for path ${pathname}`)
      
      // If requesting a protected route, redirect to login
      if (isProtectedRoute(pathname)) {
        console.log(`[Middleware] Redirecting to sign-in from protected route: ${pathname}`)
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }
    }

    // For API routes, ensure proper Content-Type header is set to avoid content encoding issues
    if (pathname.startsWith('/api/')) {
      response.headers.set('Content-Type', 'application/json');
    }

    return response
  } catch (error) {
    console.error(`[Middleware] Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
    return NextResponse.next()
  }
}

/**
 * Helper function to determine if a route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  // API routes that require authentication
  if (pathname.startsWith('/api/')) {
    // Exclude public API routes
    return !(
      pathname.startsWith('/api/auth') ||
      pathname === '/api/health'
    );
  }

  // Dashboard and other protected front-end routes
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/company-selection') ||
    pathname.startsWith('/waiting-approval') ||
    pathname.startsWith('/admin')
  )
} 