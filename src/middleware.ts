import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/auth-server-utils'
import { AUTH_TOKEN_KEY } from '@/lib/auth-client-utils'

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
  '/api/auth', // Only this specific API path should be public, not all API routes
  '/terms',
  '/privacy',
  '/verify-email', // Added missing public path
  '/documentation', // Added missing public path
]

// Helper to check if a path starts with any of the public paths
function isPublicPath(path: string): boolean {
  // Critical bug fix: API paths like /api/profile were being mistakenly matched by /api/auth
  // We need to ensure exact matching for API routes
  if (path.startsWith('/api/')) {
    // Only match exact API paths or explicit API paths with subpaths
    return PUBLIC_PATHS.some(publicPath => 
      publicPath === path || // Exact match
      (publicPath.startsWith('/api/') && path.startsWith(publicPath + '/')) // Match /api/auth/something
    );
  }
  
  // Handle dashboard and other protected paths - explicitly exclude them from public paths
  if (path.startsWith('/dashboard') || 
      path.startsWith('/profile') || 
      path.startsWith('/admin') || 
      path.startsWith('/company-selection')) {
    return false;
  }
  
  // For non-API paths, check if it starts with any public path
  return PUBLIC_PATHS.some((publicPath) => path === publicPath || path.startsWith(publicPath + '/'))
}

// Helper to check if path is a static asset
function isStaticAsset(path: string): boolean {
  // API paths should never be considered static assets
  if (path.startsWith('/api/')) {
    return false;
  }
  
  return (
    path.startsWith('/_next/') || 
    path.startsWith('/favicon.ico') || 
    path.includes('sw.js') ||
    path.endsWith('.json') || // Added common static asset extensions
    path.endsWith('.xml') ||
    path.endsWith('.txt') ||
    /\.(svg|png|jpg|jpeg|gif|webp|css|js|json|woff|woff2|ttf|eot)$/.test(path)
  )
}

/**
 * Helper function for logging cookie information during debugging
 */
function logCookieDetails(request: NextRequest) {
  try {
    const cookies = request.cookies.getAll();
    const cookieNames = cookies.map(c => c.name);
    const hasAuthCookie = cookieNames.some(name => name.includes(AUTH_TOKEN_KEY));
    
    console.log(`[Middleware] Cookies: count=${cookies.length}, hasAuthCookie=${hasAuthCookie}`);
    
    // Log individual cookies for deeper debugging
    if (process.env.NODE_ENV === 'development') {
      cookieNames.forEach(name => {
        console.log(`[Middleware] Cookie: ${name}`);
      });
    }
  } catch (error) {
    console.error(`[Middleware] Error logging cookies:`, error);
  }
}

/**
 * Check if session is still valid based on expiration time
 */
function isSessionValid(session: any): boolean {
  if (!session) return false;
  
  // Check if session has an expiration time
  if (session.expires_at) {
    const expiresAt = new Date(session.expires_at * 1000);
    return expiresAt > new Date();
  }
  
  // If no expiration time is found, check for expires_in as fallback
  if (session.expires_in) {
    // expires_in is in seconds from when the session was created
    // if we don't have created_at, we can't calculate, so assume invalid
    if (!session.created_at) return false;
    
    const createdAt = new Date(session.created_at);
    const expiresAt = new Date(createdAt.getTime() + (session.expires_in * 1000));
    return expiresAt > new Date();
  }
  
  // If we can't determine expiration, safer to assume it's invalid
  return false;
}

/**
 * Update the user's session by refreshing tokens if needed
 * Returns a response with updated cookies or redirects to sign-in
 */
async function updateSessionAndCookies(request: NextRequest): Promise<NextResponse> {
  try {
    // Create a response that we'll modify with cookies and return
    const response = NextResponse.next();
    
    // Use our standardized server-side Supabase client
    const supabase = createSupabaseServerClient(request);
    
    // Get the current session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Middleware] Session error:', error.message);
      // Redirect to sign-in on session error for pages, or return 401 for API routes
      const url = request.nextUrl.clone();
      
      if (url.pathname.startsWith('/api/')) {
        return NextResponse.json({ 
          error: 'Authentication required',
          message: 'Your session is invalid or has expired. Please sign in again.'
        }, { status: 401 });
      }
      
      url.pathname = '/sign-in';
      // Preserve the original URL to redirect back after authentication
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
    
    // If there's no session, redirect to sign-in
    if (!data.session) {
      console.log('[Middleware] No session found, redirecting to sign-in');
      
      // For API routes, return a 401 response
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ 
          error: 'Authentication required',
          message: 'You must be signed in to access this resource.'
        }, { status: 401 });
      }
      
      // For page routes, redirect to sign-in
      const url = request.nextUrl.clone();
      url.pathname = '/sign-in';
      // Preserve the original URL to redirect back after authentication
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
    
    // Try to refresh the session if needed
    try {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && refreshData.session) {
        console.log('[Middleware] Session refreshed successfully');
      } else if (refreshError) {
        console.warn('[Middleware] Error refreshing session:', refreshError.message);
        
        // If we can't refresh the session but still have a valid session, proceed
        if (data.session && isSessionValid(data.session)) {
          console.log('[Middleware] Using existing valid session despite refresh error');
        } else {
          // Session is expired and refresh failed, redirect to login
          console.warn('[Middleware] Session expired and refresh failed');
          const url = request.nextUrl.clone();
          
          if (url.pathname.startsWith('/api/')) {
            return NextResponse.json({ 
              error: 'Session expired',
              message: 'Your session has expired and could not be refreshed. Please sign in again.'
            }, { status: 401 });
          }
          
          url.pathname = '/sign-in';
          url.searchParams.set('error', 'session_expired');
          url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
          return NextResponse.redirect(url);
        }
      }
    } catch (refreshError) {
      console.warn('[Middleware] Unexpected error refreshing session:', refreshError);
    }
    
    return response;
  } catch (error) {
    console.error('[Middleware] Unexpected error in updateSessionAndCookies:', error);
    
    // Fall back to redirect for safety
    const url = request.nextUrl.clone();
    
    if (url.pathname.startsWith('/api/')) {
      return NextResponse.json({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.'
      }, { status: 500 });
    }
    
    url.pathname = '/sign-in';
    url.searchParams.set('error', 'auth_error');
    return NextResponse.redirect(url);
  }
}

/**
 * Middleware runs on every request
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Enhanced debugging
  console.log('[Middleware] Processing request for path:', pathname);
  
  // Only log cookie details for non-static assets to reduce noise
  if (!isStaticAsset(pathname)) {
    logCookieDetails(request);
  }
  
  // Skip middleware for public paths and static files
  if (isPublicPath(pathname) || isStaticAsset(pathname)) {
    console.log('[Middleware] Skipping middleware for public path or static asset');
    return NextResponse.next()
  }
  
  console.log('[Middleware] Running auth middleware for protected path:', pathname);
  
  // Use our updated session handling function
  return await updateSessionAndCookies(request);
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
