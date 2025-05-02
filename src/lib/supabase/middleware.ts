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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables in middleware')
    return response
  }

  // Create a Supabase client specifically for handling auth in the middleware
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)?.value
          return cookie || null
        },
        set(name: string, value: string, options: any) {
          // Set the cookie on the response
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

  // This gets the user and refreshes the session if needed
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  
  // Log status for debugging
  const pathname = request.nextUrl.pathname
  
  // Don't redirect API routes, but still refresh the session
  if (pathname.startsWith('/api/')) {
    return response
  }
  
  if (user) {
    console.log(`[Middleware] Session found for user ${user.id.slice(0, 6)}... on ${pathname}`)
  } else {
    console.log(`[Middleware] No session found for path ${pathname}`)
    
    // If requesting a protected route, redirect to login
    if (isProtectedRoute(pathname)) {
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
    pathname.startsWith('/profile') ||
    pathname.startsWith('/company-selection') ||
    pathname.startsWith('/waiting-approval') ||
    pathname.startsWith('/admin')
  )
} 