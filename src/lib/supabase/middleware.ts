import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

/**
 * Middleware helper for Supabase authentication
 * This function refreshes the user's session and updates cookies
 */
export async function updateSession(request: NextRequest) {
  try {
    // Create a response object that we'll modify and return
    const response = NextResponse.next()
    
    // Create a Supabase client specifically for this middleware request
    const supabase = createMiddlewareClient({ req: request, res: response })
    
    // This will refresh the user's session if needed and store in the response cookies
    await supabase.auth.getUser()
    
    return response
  } catch (error) {
    console.error('Error in updateSession middleware:', error)
    // If there's an error, just return the response without modifications
    return NextResponse.next()
  }
} 