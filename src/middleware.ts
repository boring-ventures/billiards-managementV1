import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { AUTH_TOKEN_KEY } from '@/lib/auth-utils'

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
  
  console.log('[Middleware] Running auth middleware for protected path:', pathname);
  
  // Use the updateSession helper to refresh tokens and update cookies
  // This uses Supabase's recommended pattern for Next.js App Router
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
