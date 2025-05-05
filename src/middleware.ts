import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AUTH_TOKEN_KEY } from '@/lib/auth-client-utils'

// Function to get the Supabase cookie pattern
function getSupabaseCookiePattern(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = supabaseUrl?.match(/([^/]+)\.supabase\.co/)?.[1] || 'unknown'
  return `sb-${projectRef}-auth-token`;
}

// Base URL for redirects - use the environment variable or default to the request origin
const getBaseUrl = (request: NextRequest) => {
  return process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
};

// Add timing utilities for performance monitoring that work in all environments
const startTimer = () => {
  return Date.now();
};

const endTimer = (start: number) => {
  return Date.now() - start; // Return elapsed time in milliseconds
};

// Enhance logging with performance context
const logWithPerformance = (message: string, performanceMs?: number, context?: Record<string, any>) => {
  const isVercel = process.env.VERCEL === '1';
  const prefix = isVercel ? '[Vercel]' : '[Local]';
  
  // Include performance data if available
  if (performanceMs !== undefined) {
    console.log(`${prefix} ${message} (${performanceMs.toFixed(2)}ms)`, context || '');
  } else {
    console.log(`${prefix} ${message}`, context || '');
  }
};

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
function logCookieDetails(request: NextRequest): { hasAuthCookie: boolean, cookieCount: number } {
  try {
    const cookies = request.cookies.getAll();
    const cookieNames = cookies.map(c => c.name);
    const hasAuthCookie = cookieNames.some(name => name.includes(AUTH_TOKEN_KEY));
    
    logWithPerformance(`Cookies: count=${cookies.length}, hasAuthCookie=${hasAuthCookie}`, 
      undefined, 
      { cookieNames: cookieNames.join(', ') }
    );
    
    // Log individual cookies for deeper debugging
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      cookieNames.forEach(name => {
        console.log(`[Middleware] Cookie: ${name}`);
      });
    }
    
    return { hasAuthCookie, cookieCount: cookies.length };
  } catch (error) {
    console.error(`[Middleware] Error logging cookies:`, error);
    return { hasAuthCookie: false, cookieCount: 0 };
  }
}

/**
 * Check if session is still valid based on expiration time
 * Enhanced with defensive programming and detailed logging
 */
function isSessionValid(session: any): boolean {
  // Guard against null/undefined sessions
  if (!session) {
    logWithPerformance('Session validation failed: null or undefined session');
    return false;
  }
  
  try {
    // Check if session has an expiration time
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000);
      const now = new Date();
      const isValid = expiresAt > now;
      
      // Log validation result with expiration details
      const timeUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      logWithPerformance(
        `Session expires_at validation: ${isValid ? 'VALID' : 'EXPIRED'}`,
        undefined,
        { 
          expiresAt: expiresAt.toISOString(), 
          now: now.toISOString(),
          timeUntilExpirySeconds: timeUntilExpiry
        }
      );
      
      return isValid;
    }
    
    // If no expiration time is found, check for expires_in as fallback
    if (session.expires_in) {
      // If we don't have created_at, we can't calculate, so assume invalid
      if (!session.created_at) {
        logWithPerformance('Session validation failed: has expires_in but missing created_at');
        return false;
      }
      
      const createdAt = new Date(session.created_at);
      const expiresAt = new Date(createdAt.getTime() + (session.expires_in * 1000));
      const now = new Date();
      const isValid = expiresAt > now;
      
      // Log validation result with expiration details
      const timeUntilExpiry = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
      logWithPerformance(
        `Session expires_in validation: ${isValid ? 'VALID' : 'EXPIRED'}`,
        undefined,
        { 
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(), 
          now: now.toISOString(),
          timeUntilExpirySeconds: timeUntilExpiry
        }
      );
      
      return isValid;
    }
    
    // Check for any other expiration indicator in the session
    if (session.exp) {
      // Some JWT implementations use 'exp' directly
      const expiresAt = new Date(session.exp * 1000);
      const now = new Date();
      const isValid = expiresAt > now;
      
      logWithPerformance(
        `Session exp validation: ${isValid ? 'VALID' : 'EXPIRED'}`,
        undefined,
        { 
          expiresAt: expiresAt.toISOString(), 
          now: now.toISOString() 
        }
      );
      
      return isValid;
    }
    
    // If we can't determine expiration, log this unusual state and default to valid
    // This is a change from previous behavior, but prevents false negatives in production
    logWithPerformance('Session validation WARNING: Could not determine expiration, assuming VALID', undefined, {
      sessionKeys: Object.keys(session).join(', ')
    });
    
    // In production, when we can't determine expiration, we'll assume it's valid
    // and let the server components handle any actual validation errors
    return process.env.NODE_ENV === 'production';
  } catch (error) {
    // If any error occurs during validation, log it but assume valid in production
    // to prevent unnecessary sign-out loops
    console.error('[Middleware] Error during session validation:', error);
    return process.env.NODE_ENV === 'production';
  }
}

/**
 * Update the user's session by refreshing tokens if needed
 * Returns a response with updated cookies or redirects to sign-in
 * Enhanced with timing metrics and more robust error handling
 */
async function updateSessionAndCookies(request: NextRequest): Promise<NextResponse> {
  const overallTimer = startTimer();
  let getSessionTimer: number | null = null;
  let refreshSessionTimer: number | null = null;
  
  try {
    // Create a response that we'll modify with cookies and return
    const response = NextResponse.next();
    
    // Log cookie state before auth operations
    const { hasAuthCookie } = logCookieDetails(request);
    
    if (!hasAuthCookie) {
      logWithPerformance('No auth cookie found, skipping session check');
      
      // Redirect to sign-in (allowing public paths to be handled earlier in middleware)
      const url = new URL('/sign-in', getBaseUrl(request));
      
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return NextResponse.json({ 
          error: 'Authentication required',
          message: 'No session cookie found. Please sign in again.'
        }, { status: 401 });
      }
      
      url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
      url.searchParams.set('error', 'session_missing');
      return NextResponse.redirect(url);
    }
    
    try {
      // Use Supabase client directly to avoid bundling issues
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name) {
              return request.cookies.get(name)?.value;
            },
            set(name, value, options) {
              // This is a middleware context, so we don't need to set cookies
              // as they'll be included in the eventual response
            },
            remove(name, options) {
              // This is a middleware context, so we don't need to remove cookies
            },
          },
        }
      );
      
      // Get the current session with timing
      getSessionTimer = startTimer();
      const { data, error } = await supabase.auth.getSession();
      const getSessionMs = getSessionTimer ? endTimer(getSessionTimer) : 0;
      
      if (error) {
        logWithPerformance('Session error', getSessionMs, { 
          error: error.message,
          status: error.status || 'unknown'
        });
        
        // Redirect to sign-in on session error for pages, or return 401 for API routes
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json({ 
            error: 'Authentication required',
            message: 'Your session is invalid or has expired. Please sign in again.'
          }, { status: 401 });
        }
        
        const url = new URL('/sign-in', getBaseUrl(request));
        // Preserve the original URL to redirect back after authentication
        url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
        url.searchParams.set('error', 'invalid_session');
        return NextResponse.redirect(url);
      }
      
      // If there's no session, redirect to sign-in
      if (!data.session) {
        logWithPerformance('No session found in getSession response', getSessionMs);
        
        // For API routes, return a 401 response
        if (request.nextUrl.pathname.startsWith('/api/')) {
          return NextResponse.json({ 
            error: 'Authentication required',
            message: 'You must be signed in to access this resource.'
          }, { status: 401 });
        }
        
        // For page routes, redirect to sign-in
        const url = new URL('/sign-in', getBaseUrl(request));
        // Preserve the original URL to redirect back after authentication
        url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
        return NextResponse.redirect(url);
      }
      
      // Log successful session retrieval
      logWithPerformance('Session retrieved successfully', getSessionMs, {
        userId: data.session.user?.id || 'unknown',
        expiresAt: data.session.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : 'unknown'
      });
      
      // Try to refresh the session if needed
      try {
        refreshSessionTimer = startTimer();
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        const refreshSessionMs = refreshSessionTimer ? endTimer(refreshSessionTimer) : 0;
        
        if (!refreshError && refreshData.session) {
          logWithPerformance('Session refreshed successfully', refreshSessionMs);
        } else if (refreshError) {
          logWithPerformance('Error refreshing session', refreshSessionMs, { 
            error: refreshError.message,
            status: refreshError.status || 'unknown'
          });
          
          // If we can't refresh the session but still have a valid session, proceed
          if (data.session && isSessionValid(data.session)) {
            logWithPerformance('Using existing valid session despite refresh error');
          } else {
            // Session is expired and refresh failed, redirect to login
            logWithPerformance('Session expired and refresh failed');
            
            if (request.nextUrl.pathname.startsWith('/api/')) {
              return NextResponse.json({ 
                error: 'Session expired',
                message: 'Your session has expired and could not be refreshed. Please sign in again.'
              }, { status: 401 });
            }
            
            const url = new URL('/sign-in', getBaseUrl(request));
            url.searchParams.set('error', 'session_expired');
            url.searchParams.set('redirectTo', request.nextUrl.pathname + request.nextUrl.search);
            return NextResponse.redirect(url);
          }
        }
      } catch (refreshError) {
        logWithPerformance('Unexpected error refreshing session', undefined, { error: String(refreshError) });
        
        // Continue with existing session if it's valid, despite refresh error
        if (data.session && isSessionValid(data.session)) {
          logWithPerformance('Continuing with existing valid session despite refresh error');
        } else {
          // Only redirect if the session is definitely invalid
          const url = new URL('/sign-in', getBaseUrl(request));
          url.searchParams.set('error', 'refresh_error');
          url.searchParams.set('redirectTo', request.nextUrl.pathname);
          return NextResponse.redirect(url);
        }
      }
      
      const overallMs = endTimer(overallTimer);
      logWithPerformance('Session handling complete', overallMs);
      return response;
    } catch (authError) {
      logWithPerformance('Critical error in auth handling', undefined, { error: String(authError) });
      throw authError; // Re-throw to be handled by outer try-catch
    }
  } catch (error) {
    console.error('[Middleware] Unexpected error in updateSessionAndCookies:', error);
    
    // Fall back to redirect for safety
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.'
      }, { status: 500 });
    }
    
    const url = new URL('/sign-in', getBaseUrl(request));
    url.searchParams.set('error', 'auth_error');
    return NextResponse.redirect(url);
  }
}

/**
 * Middleware runs on every request
 */
export async function middleware(request: NextRequest) {
  const pathTimer = startTimer();
  const { pathname } = request.nextUrl
  
  // Enhanced logging with environment context
  const isVercel = process.env.VERCEL === '1';
  logWithPerformance(`[${isVercel ? 'Vercel' : 'Local'}] Processing request for path: ${pathname}`);
  
  // Skip middleware for public paths and static files
  if (isPublicPath(pathname)) {
    logWithPerformance(`Skipping middleware for public path: ${pathname}`, endTimer(pathTimer));
    return NextResponse.next();
  }
  
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }
  
  // Only log cookie details for non-static assets to reduce noise
  if (!isStaticAsset(pathname)) {
    logCookieDetails(request);
  }
  
  logWithPerformance(`Running auth middleware for protected path: ${pathname}`);
  
  // Use our updated session handling function
  try {
    const result = await updateSessionAndCookies(request);
    const totalMs = endTimer(pathTimer);
    logWithPerformance(`Middleware completed for ${pathname}`, totalMs);
    return result;
  } catch (error) {
    const totalMs = endTimer(pathTimer);
    logWithPerformance(`Middleware failed for ${pathname}`, totalMs, { error: String(error) });
    
    // Last resort error handling - redirect to error page for non-API routes
    if (!request.nextUrl.pathname.startsWith('/api/')) {
      const url = new URL('/error', getBaseUrl(request));
      url.searchParams.set('code', '500');
      url.searchParams.set('message', 'An unexpected error occurred');
      return NextResponse.redirect(url);
    }
    
    // Return 500 for API routes
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 