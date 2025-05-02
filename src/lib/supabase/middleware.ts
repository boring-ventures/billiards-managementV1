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
    
    // Always try to get the session first - this will check cookies
    const { data: { session } } = await supabase.auth.getSession()
    
    // If we have a session, refresh it to ensure token isn't expired
    if (session) {
      // This creates a new access token if the current one is expired
      // and updates the Cookie automatically
      const { data: { user } } = await supabase.auth.getUser()
      
      // If session refresh failed and user is no longer valid, sign out
      if (!user) {
        await supabase.auth.signOut()
        
        // If trying to access protected route, redirect to login
        if (request.nextUrl.pathname.startsWith('/dashboard') ||
            request.nextUrl.pathname.startsWith('/company-selection') ||
            request.nextUrl.pathname.startsWith('/waiting-approval')) {
          const redirectUrl = new URL('/sign-in', request.url)
          return NextResponse.redirect(redirectUrl)
        }
      }
    } 
    // No session but trying to access protected route
    else if (
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/company-selection') ||
      request.nextUrl.pathname.startsWith('/waiting-approval')
    ) {
      const redirectUrl = new URL('/sign-in', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    return response
  } catch (error) {
    console.error('Error in updateSession middleware:', error)
    
    // If there's an error with auth and path requires auth, redirect to sign-in
    if (
      request.nextUrl.pathname.startsWith('/dashboard') ||
      request.nextUrl.pathname.startsWith('/company-selection') ||
      request.nextUrl.pathname.startsWith('/waiting-approval')
    ) {
      const redirectUrl = new URL('/sign-in', request.url)
      return NextResponse.redirect(redirectUrl)
    }
    
    // Otherwise, continue to next middleware
    return NextResponse.next()
  }
} 