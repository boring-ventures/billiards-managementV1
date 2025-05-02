import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

/**
 * Middleware helper for Supabase authentication
 * This function refreshes the user's session and updates cookies
 * following Supabase's recommended pattern
 */
export async function updateSession(request: NextRequest) {
  try {
    // Create a response object that we'll modify and return
    const response = NextResponse.next()
    
    // Log the request path to help debug routing issues
    const requestPath = request.nextUrl.pathname;
    console.log(`[Middleware] Processing request for: ${requestPath}`);
    
    // Check for auth token in headers (API requests might use this instead of cookies)
    const authHeader = request.headers.get('authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    
    // Log available cookies for debugging (without sensitive values)
    const cookieNames = Array.from(request.cookies.getAll()).map(c => c.name);
    const hasCookie = request.cookies.has('sb-auth-token') || request.cookies.has('sb-refresh-token');
    console.log(`[Middleware] Cookies: ${cookieNames.join(', ')}`);
    console.log(`[Middleware] Has auth token cookie: ${hasCookie}, Has Bearer token: ${hasBearerToken}`);
    
    // IMPORTANT FIX 1: Check for API routes with Authorization header FIRST
    // This allows API routes to bypass the cookie check and use Bearer token auth
    if (requestPath.startsWith('/api/') && hasBearerToken) {
      console.log('[Middleware] API route with Authorization header - allowing through');
      return response; // Let the API route handle the auth itself
    }
    
    // Create a Supabase client specifically for this middleware request
    const supabase = createMiddlewareClient({ req: request, res: response })
    
    // IMPORTANT FIX 2: Use getUser() instead of getSession() as recommended by Supabase
    // This ensures the token is properly validated with the Supabase Auth server
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('[Middleware] User validation error:', userError.message);
    }
    
    // If we have a valid user, proceed with the request
    if (userData?.user) {
      console.log('[Middleware] Valid user found:', userData.user.id);
      
      // Refresh the session to ensure token is updated if needed
      // This will update the cookies in the response
      await supabase.auth.getSession();
      
      // We have a valid user, proceed with request
      return response;
    } 
    // No valid user but trying to access protected route
    else if (isProtectedRoute(request.nextUrl.pathname)) {
      console.log('[Middleware] No valid user for protected route');
      
      // Check if this is an API route
      if (requestPath.startsWith('/api/')) {
        // For API routes, check if we're in deployment preview or local development
        // In these environments, we'll be more lenient for testing
        if (process.env.VERCEL_ENV === 'preview' || process.env.NODE_ENV === 'development') {
          console.log('[Middleware] API route in dev/preview environment - proceeding');
          return response;
        }
        
        // For production API routes, just return 401 instead of redirecting
        console.log('[Middleware] API route - returning 401');
        return NextResponse.json(
          { error: 'Not authenticated', message: 'Authentication required' },
          { status: 401 }
        )
      }
      
      // For browser routes, redirect to sign-in
      console.log('[Middleware] Redirecting to sign-in');
      const redirectUrl = new URL('/sign-in', request.url)
      // Add original URL as a query parameter to redirect back after login
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    } else {
      console.log('[Middleware] No valid user, but not a protected route');
    }
    
    console.log('[Middleware] Proceeding with request');
    return response
  } catch (error) {
    console.error('[Middleware] Error in updateSession middleware:', error)
    
    // If there's an error with auth and path requires auth, redirect to sign-in
    if (isProtectedRoute(request.nextUrl.pathname)) {
      // Check if this is an API route
      if (request.nextUrl.pathname.startsWith('/api/')) {
        // For API routes, just return 401 instead of redirecting
        return NextResponse.json(
          { error: 'Auth error', message: 'Authentication failed' },
          { status: 401 }
        )
      }
      
      // For browser routes, redirect to sign-in
      const redirectUrl = new URL('/sign-in', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Otherwise, continue to next middleware
    return NextResponse.next()
  }
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