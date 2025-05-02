import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient, AUTH_TOKEN_KEY } from '@/lib/auth-utils'

// List of paths that should not check for authentication
const PUBLIC_PATHS = [
  '/sign-in',
  '/sign-up',
  '/sign-out',
  '/magic-link',
  '/auth/confirm',
  '/auth/callback',
  '/forgot-password',
  '/api/auth',
  '/terms',
  '/privacy',
]

// Helper to check if a path starts with any of the public paths
function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath))
}

/**
 * Middleware runs on every request to verify authentication
 */
export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    
    // Skip middleware for public paths and static files
    if (isPublicPath(pathname) || pathname.match(/\.(.*)$/)) {
      console.log(`[Middleware] Skipping auth check for auth route: ${pathname}`)
      return NextResponse.next()
    }
    
    // Check for auth cookie presence to save a round trip if possible
    const hasAuthCookie = request.cookies.has(AUTH_TOKEN_KEY)
    if (!hasAuthCookie && !request.headers.has('authorization')) {
      console.error(`[Middleware] No auth cookie or Authorization header present for: ${pathname}`)
      
      // If requesting API, return 401
      if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ 
          error: 'Not authenticated', 
          detail: 'No authentication credentials found' 
        }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      }
      
      // Redirect to login for non-API routes
      const redirectUrl = new URL('/sign-in', request.url)
      redirectUrl.searchParams.set('callbackUrl', encodeURIComponent(request.url))
      return NextResponse.redirect(redirectUrl)
    }
    
    // Response object that we'll pass to Supabase for cookie handling
    const response = NextResponse.next()
    
    // Create Supabase client using special middleware implementation
    const supabase = createMiddlewareClient(request, response)
    
    // This will refresh the session if needed and update cookies
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      const errorMessage = error?.message || 'Auth session missing or invalid!'
      console.error(`[Middleware] Error getting user: ${errorMessage}`)
      
      // If requesting API, return 401 with error details
      if (pathname.startsWith('/api/')) {
        return new NextResponse(JSON.stringify({ 
          error: 'Not authenticated', 
          detail: errorMessage,
          path: pathname
        }), {
          status: 401,
          headers: { 'content-type': 'application/json' }
        })
      }
      
      // For dashboard routes, add debug info to the redirect URL
      const redirectUrl = new URL('/sign-in', request.url)
      redirectUrl.searchParams.set('callbackUrl', encodeURIComponent(request.url))
      redirectUrl.searchParams.set('error', 'session_expired')
      return NextResponse.redirect(redirectUrl)
    }

    // Debug information - log successful authentications
    console.log(`[Middleware] User ${user.id} authenticated for ${pathname}`)

    // User is authenticated, allow access and pass updated cookies
    return response
  } catch (error) {
    console.error('[Middleware] Unexpected error:', error)
    return NextResponse.next() // Fall back to standard behavior on errors
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
