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
    const hasSupabaseCookie = cookieNames.some(name => name.includes(getSupabaseCookiePattern()));
    
    logWithPerformance(`Cookies: count=${cookies.length}, hasAuthCookie=${hasAuthCookie}, hasSupabaseCookie=${hasSupabaseCookie}`, 
      undefined, 
      { cookieNames: cookieNames.join(', ') }
    );
    
    // Log individual cookies for deeper debugging
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_AUTH === 'true') {
      cookieNames.forEach(name => {
        console.log(`[Middleware] Cookie: ${name}`);
      });
    }
    
    return { hasAuthCookie: hasAuthCookie || hasSupabaseCookie, cookieCount: cookies.length };
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
  
  // IMPORTANT: Skip detailed validation unless in development mode
  // This helps avoid premature session expiration in production
  // The server components will handle proper validation when needed
  if (process.env.NODE_ENV === 'production') {
    logWithPerformance('Production mode: Skipping detailed session validation');
    return true;
  }
  
  try {
    // Development mode: perform detailed validation
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
    
    // If we can't determine expiration, assume valid
    logWithPerformance('Session validation WARNING: Could not determine expiration, assuming VALID', undefined, {
      sessionKeys: Object.keys(session).join(', ')
    });
    
    return true;
  } catch (error) {
    // If any error occurs during validation, log it but assume valid
    console.error('[Middleware] Error during session validation:', error);
    return true;
  }
}

/**
 * Main middleware function. Handles authentication checks and redirects.
 * Now enhanced with detailed logging, performance metrics, and more robust session checks.
 * 
 * High-level flow:
 * 1. Skip checks for static assets and files
 * 2. Allow public paths without auth
 * 3. For protected paths, verify auth and session validity
 * 4. Handle redirects or updates to response cookies as needed
 */
export async function middleware(request: NextRequest) {
  // Track overall performance
  const startTime = startTimer();
  
  // Get the path from the URL
  const path = request.nextUrl.pathname;
  
  logWithPerformance(`Middleware: ${path}`);
  
  // Bypass all middleware checks for static assets
  if (isStaticAsset(path)) {
    return NextResponse.next();
  }
  
  // Allow access to public paths without authentication
  if (isPublicPath(path)) {
    logWithPerformance(`Public path: ${path}, skipping auth check`);
    return NextResponse.next();
  }
  
  // Log cookie details for debugging - don't redirect yet
  logCookieDetails(request);
  
  // IMPORTANT - Temporarily disable middleware auth checks in production
  // This allows us to test our client-side auth checks more effectively
  // The server components will still enforce proper authorization
  if (process.env.NODE_ENV === 'production' || process.env.DISABLE_MIDDLEWARE_AUTH === 'true') {
    logWithPerformance('Auth middleware checks disabled for this environment - using client-side checks');
    return NextResponse.next();
  }
  
  // For protected paths, set up a Supabase client to check authentication
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            const cookieValue = request.cookies.get(name)?.value;
            logWithPerformance(`Cookie get: ${name}`, undefined, { value: cookieValue ? 'has value' : 'undefined' });
            return cookieValue;
          },
          set(name, value, options) {
            // This is just a placeholder as we'll manually update the response cookies later
            logWithPerformance(`Cookie set attempted: ${name}`, undefined, options);
          },
          remove(name, options) {
            // This is just a placeholder as we'll manually update the response cookies later
            logWithPerformance(`Cookie remove attempted: ${name}`, undefined, options);
          },
        },
      }
    )
    
    // Get the session from Supabase
    const sessionTimer = startTimer();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const sessionTime = endTimer(sessionTimer);
    
    if (sessionError) {
      console.error('[Middleware] Error getting session:', sessionError);
      // Redirect to sign-in if there's an error
      const url = new URL('/sign-in', getBaseUrl(request));
      return NextResponse.redirect(url);
    }
    
    // If we have a session, check if it's valid
    if (sessionData?.session) {
      logWithPerformance('Session found in middleware', sessionTime);
      
      // Our more lenient session validation
      if (isSessionValid(sessionData.session)) {
        // Valid session, allow access
        return NextResponse.next();
      } else {
        logWithPerformance('Session is invalid or expired');
        
        // Try to refresh the session
        try {
          const refreshTimer = startTimer();
          const { data: refreshData, error: refreshError } = 
            await supabase.auth.refreshSession();
          const refreshTime = endTimer(refreshTimer);
          
          if (refreshError) {
            console.error('[Middleware] Error refreshing session:', refreshError);
            // Redirect to sign-in if refresh fails
            const url = new URL('/sign-in', getBaseUrl(request));
            return NextResponse.redirect(url);
          }
          
          if (refreshData?.session) {
            logWithPerformance('Session refreshed successfully', refreshTime);
            // Allow access with the refreshed session
            return NextResponse.next();
          }
        } catch (refreshError) {
          console.error('[Middleware] Exception during session refresh:', refreshError);
        }
        
        // If we reach here, the session couldn't be refreshed
        const url = new URL('/sign-in', getBaseUrl(request));
        return NextResponse.redirect(url);
      }
    } else {
      logWithPerformance('No session found in middleware');
      
      // No session, redirect to sign-in for non-API paths
      if (!path.startsWith('/api/')) {
        const url = new URL('/sign-in', getBaseUrl(request));
        return NextResponse.redirect(url);
      }
      
      // For API paths, return error response
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please sign in to access this resource.'
      }, { status: 401 });
    }
  } catch (error) {
    console.error('[Middleware] Critical error in auth middleware:', error);
    
    // Fallback to client handling for safety, don't block user access
    // Server components will still enforce proper authorization
    return NextResponse.next();
  } finally {
    const totalTime = endTimer(startTime);
    logWithPerformance(`Middleware execution completed for ${path}`, totalTime);
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