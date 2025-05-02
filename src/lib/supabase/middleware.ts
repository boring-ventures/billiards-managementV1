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
    
    // This refreshes the user's session and automatically updates cookies
    // Important: Using getUser() instead of getSession() as recommended by Supabase
    const { data: { user } } = await supabase.auth.getUser()
    
    // If we detected a user, verify the session is valid
    if (user) {
      // Verify the session is valid by calling getSession
      // This will update session cookies if token is expired
      const { data: { session } } = await supabase.auth.getSession()
      
      // If no valid session but we have a user, sign them out
      if (!session) {
        await supabase.auth.signOut()
        
        // Redirect to login for pages that require authentication
        const url = request.nextUrl.clone()
        if (url.pathname.startsWith('/dashboard')) {
          url.pathname = '/sign-in'
          return NextResponse.redirect(url)
        }
      }
    }
    
    return response
  } catch (error) {
    console.error('Error in updateSession middleware:', error)
    
    // If there's an error with auth, continue
    return NextResponse.next()
  }
} 