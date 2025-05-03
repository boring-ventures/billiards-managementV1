import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase'
import { AUTH_TOKEN_KEY } from '@/lib/auth-utils'
import { refreshSessionWithBackoff } from '@/lib/middleware/sessionRefresh'
import { checkUserCompanyStatus, UserCompanyStatus } from '@/lib/middleware/userCompanyHandler'
import { getSelectedCompany, SELECTED_COMPANY_COOKIE } from '@/lib/middleware/companySwitcher'
import { logAuthEvent, AuthEventType } from '@/lib/middleware/authLogger'
import { 
  createApiErrorResponse, 
  createErrorRedirect, 
  createGracefulDegradation,
  AuthErrorType 
} from '@/lib/middleware/errorResponses'

// List of paths that should not check for authentication
const PUBLIC_PATHS = [
  '/',
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

// Helper to check if path is a static asset
function isStaticAsset(path: string): boolean {
  return (
    path.startsWith('/_next/') || 
    path.startsWith('/favicon.ico') || 
    path.includes('sw.js') ||
    /\.(svg|png|jpg|jpeg|gif|webp|css|js|json|woff|woff2|ttf|eot)$/.test(path)
  )
}

/**
 * Log detailed cookie information for debugging
 */
function logCookieDetails(request: NextRequest) {
  try {
    // Get all cookies
    const allCookies = request.cookies.getAll();
    console.log(`[Cookie Debug] Found ${allCookies.length} cookies in request`);
    
    // Check for auth cookie specifically
    const authCookie = request.cookies.get(AUTH_TOKEN_KEY);
    
    if (authCookie) {
      console.log(`[Cookie Debug] Auth cookie found with name: ${AUTH_TOKEN_KEY}`);
      console.log(`[Cookie Debug] Auth cookie length: ${authCookie.value.length}`);
      console.log(`[Cookie Debug] Auth cookie first 10 chars: ${authCookie.value.substring(0, 10)}...`);
    } else {
      console.log(`[Cookie Debug] Auth cookie NOT found with name: ${AUTH_TOKEN_KEY}`);
      
      // List all cookies for debugging
      allCookies.forEach(cookie => {
        console.log(`[Cookie Debug] Found cookie: ${cookie.name}, length: ${cookie.value.length}`);
      });
    }
    
    // Check raw cookie header
    const cookieHeader = request.headers.get('cookie');
    console.log(`[Cookie Debug] Raw cookie header length: ${cookieHeader?.length || 0}`);
    if (cookieHeader) {
      console.log(`[Cookie Debug] Raw cookie header contains auth cookie name: ${cookieHeader.includes(AUTH_TOKEN_KEY)}`);
    }
  } catch (error) {
    console.error('[Cookie Debug] Error analyzing cookies:', error);
  }
}

/**
 * Middleware runs on every request
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Enhanced debugging
  console.log('[Middleware] Processing request for path:', pathname);
  logCookieDetails(request);
  
  // Skip middleware for public paths and static files
  if (isPublicPath(pathname) || isStaticAsset(pathname)) {
    console.log('[Middleware] Skipping middleware for public path or static asset');
    return NextResponse.next()
  }
  
  // Create a response to modify
  const response = NextResponse.next()
  
  // Create the Supabase client using our utility function
  const supabase = createMiddlewareClient(request, response)
  
  // Refresh the session - use getUser() as recommended in Supabase docs
  // getUser() validates the token by calling Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // If requesting API, return 401
    if (pathname.startsWith('/api/')) {
      console.error('[Middleware] Auth failed for API route:', pathname);
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Redirect to login for non-API routes
    console.log('[Middleware] Redirecting to sign-in from protected route:', pathname);
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
  
  // User is authenticated - pass request through with session cookies
  return response
}

export const config = {
  matcher: [
    /*
     * Match specific path patterns instead of using negative lookaheads
     */
    '/',
    '/dashboard/:path*',
    '/api/:path*',
    '/profile/:path*',
    '/admin/:path*',
  ],
}
