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
    
    // Create a Supabase client specifically for this middleware request
    const supabase = createMiddlewareClient({ req: request, res: response })
    
    // Log the request path to help debug routing issues
    const requestPath = request.nextUrl.pathname;
    console.log(`[Middleware] Processing request for: ${requestPath}`);
    
    // Log available cookies for debugging (without sensitive values)
    const hasCookie = request.cookies.has('sb-auth-token');
    console.log(`[Middleware] Has auth token cookie: ${hasCookie}`);
    
    // First refresh the session - this will update cookies if token is expired
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[Middleware] Session error:', sessionError.message);
    }
    
    // If we have a session, ensure it's valid and refresh if needed
    if (sessionData?.session) {
      console.log('[Middleware] Active session found');
      
      // Verify the user is still valid
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (userError || !userData?.user) {
        console.error('[Middleware] Error in middleware user verification:', userError?.message)
        // Clear invalid session
        await supabase.auth.signOut()
        
        // If trying to access protected route, redirect to login
        if (isProtectedRoute(request.nextUrl.pathname)) {
          console.log('[Middleware] Redirecting to login due to invalid user');
          const redirectUrl = new URL('/sign-in', request.url)
          return NextResponse.redirect(redirectUrl)
        }
      } else {
        console.log('[Middleware] Valid user found:', userData.user.id);
      }
    } 
    // No session but trying to access protected route
    else if (isProtectedRoute(request.nextUrl.pathname)) {
      console.log('[Middleware] No active session for protected route');
      
      // Check if this is an API route
      if (request.nextUrl.pathname.startsWith('/api/')) {
        // For API routes, just return 401 instead of redirecting
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
      console.log('[Middleware] No session, but not a protected route');
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