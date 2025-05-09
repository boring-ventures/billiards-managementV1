import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseCookiePattern } from '@/lib/supabase/client'

/**
 * Find any auth-related cookies in the request
 */
function findAuthCookies(request: NextRequest): Array<{ name: string, value: string }> {
  try {
    const cookiePattern = getSupabaseCookiePattern();
    const cookies = request.cookies.getAll();
    
    // Filter and map auth cookies
    const authCookies = cookies
      .filter(cookie => cookie.name.startsWith(cookiePattern) || cookie.name.includes('auth-token'))
      .map(cookie => ({
        name: cookie.name,
        value: cookie.value
      }));
    
    console.log(`[Middleware] Found ${authCookies.length} auth cookies with pattern '${cookiePattern}'`);
    if (authCookies.length > 0) {
      console.log(`[Middleware] Auth cookie names: ${authCookies.map(c => c.name).join(', ')}`);
    } else {
      // Log all cookies for debugging if no auth cookies found
      console.log(`[Middleware] No auth cookies found. All cookies: ${cookies.map(c => c.name).join(', ')}`);
    }
    
    return authCookies;
  } catch (error) {
    console.error(`[Middleware] Error finding auth cookies:`, error);
    return [];
  }
}

/**
 * Copy all cookies from request to response
 * This ensures we don't lose existing cookies during middleware execution
 */
function preserveExistingCookies(request: NextRequest, response: NextResponse): void {
  try {
    const cookies = request.cookies.getAll();
    for (const cookie of cookies) {
      // Skip cookies that will be set by Supabase auth
      if (cookie.name.includes('auth-token')) continue;
      
      // Copy cookie to response
      response.cookies.set({
        name: cookie.name,
        value: cookie.value,
        // Use default options for copied cookies
        path: '/',
        sameSite: 'lax',
      });
    }
    console.log(`[Middleware] Preserved ${cookies.length} existing cookies`);
  } catch (error) {
    console.error(`[Middleware] Error preserving cookies:`, error);
  }
}

/**
 * Check if a request is likely a client-side API fetch or a navigation request
 * This helps determine how to handle authentication failures
 */
function isApiRequest(request: NextRequest): boolean {
  // Check if this is an API route
  const url = new URL(request.url);
  const isApiPath = url.pathname.startsWith('/api/');
  
  // Check for common API request headers
  const acceptHeader = request.headers.get('accept');
  const isJsonRequest = acceptHeader?.includes('application/json');
  const isXhr = request.headers.get('x-requested-with') === 'XMLHttpRequest';
  
  // Check if this appears to be a fetch request from frontend code
  const isFetch = !acceptHeader?.includes('text/html') || isJsonRequest || isXhr;
  
  return isApiPath || isFetch;
}

/**
 * Middleware helper for Supabase authentication
 * This function refreshes the user's session and updates cookies
 * following Supabase's recommended pattern
 */
export async function updateSession(request: NextRequest) {
  try {
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

    const requestUrl = new URL(request.url)
    const pathname = requestUrl.pathname

    // Special case: Skip auth for auth-related routes
    if (
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/sign-in') ||
      pathname.startsWith('/sign-up') ||
      pathname.startsWith('/magic-link') ||
      pathname.startsWith('/forgot-password')
    ) {
      console.log(`[Middleware] Skipping auth check for auth route: ${pathname}`)
      return response
    }

    // Enhanced cookie debugging
    const authCookies = findAuthCookies(request);
    const hasAuthCookie = authCookies.length > 0;
    
    console.log(`[Middleware] Request cookies for ${pathname}:`);
    console.log(`- Total cookies: ${request.cookies.getAll().length}`);
    console.log(`- Has auth cookies: ${hasAuthCookie}`);
    console.log(`- Request method: ${request.method}`);
    console.log(`- Accept header: ${request.headers.get('accept') || 'none'}`);
    console.log(`- Is API request: ${isApiRequest(request)}`);
    
    if (hasAuthCookie) {
      console.log(`- Using primary auth cookie: ${authCookies[0].name}`);
      // Log a short preview of the token for debugging (first 15 chars)
      console.log(`- Token preview: ${authCookies[0].value.substring(0, 15)}...`);
    }

    // Preserve existing cookies in the response
    preserveExistingCookies(request, response);

    // Create a Supabase client specifically for handling auth in the middleware
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            console.log(`[Middleware] Looking for cookie: ${name}`);
            
            // First try exact match
            const cookie = request.cookies.get(name);
            if (cookie?.value) {
              console.log(`[Middleware] Found exact cookie: ${name} = ${cookie.value.substring(0, 15)}...`);
              return cookie.value;
            }
            
            // If looking for an auth cookie and not found, try to find an alternative
            const cookiePattern = getSupabaseCookiePattern();
            if (name.startsWith(cookiePattern) || name.includes('auth-token')) {
              // If we have any auth cookie, return the first one's value
              if (authCookies.length > 0) {
                console.log(`[Middleware] Using alternative auth cookie: ${authCookies[0].name} instead of ${name}`);
                return authCookies[0].value;
              } else {
                console.log(`[Middleware] No alternative auth cookies found for ${name}`);
              }
            }
            
            console.log(`[Middleware] Cookie not found: ${name}`);
            return null;
          },
          set(name: string, value: string, options: any) {
            // Set the cookie on the response
            console.log(`[Middleware] Setting cookie: ${name}`);
            
            // Check if cookie expires as part of this request
            const isExpiring = options.maxAge === 0 || (options.expires && new Date(options.expires) <= new Date());
            
            if (isExpiring) {
              // Only allow cookie expiration during sign-out
              const isSignOut = pathname.includes('sign-out') || pathname.includes('signout');
              
              console.log(`[Middleware] Cookie ${name} is being expired/cleared. Is sign-out? ${isSignOut}`);
              
              // If this isn't a sign-out, prevent cookie from being removed
              if (!isSignOut && name.includes('auth-token')) {
                console.log(`[Middleware] ⚠️ PREVENTING premature auth cookie removal outside of sign-out flow`);
                // Set with original value and extended maxAge instead
                const authCookie = request.cookies.get(name);
                if (authCookie?.value) {
                  response.cookies.set({
                    name,
                    value: authCookie.value,
                    ...options,
                    maxAge: 60 * 60 * 24 * 7, // 7 days
                    path: options.path || '/',
                    sameSite: options.sameSite || 'lax',
                    secure: process.env.NODE_ENV === 'production'
                  });
                  return;
                }
              }
            }
            
            // Standard cookie setting logic
            response.cookies.set({
              name,
              value,
              ...options,
              sameSite: options.sameSite || 'lax',
              path: options.path || '/',
              secure: process.env.NODE_ENV === 'production'
            })
          },
          remove(name: string, options: any) {
            console.log(`[Middleware] Removing cookie: ${name}`);
            
            // Only allow cookie removal during sign-out
            const isSignOut = pathname.includes('sign-out') || pathname.includes('signout');
            
            // If this is an auth cookie and not on sign-out, prevent removal
            if (!isSignOut && name.includes('auth-token')) {
              console.log(`[Middleware] ⚠️ PREVENTING auth cookie removal outside of sign-out flow`);
              return;
            }
            
            // Handle cookie removal by setting MaxAge to 0
            response.cookies.set({
              name,
              value: '',
              ...options,
              maxAge: 0,
              path: options.path || '/',
            })
            
            // If this is an auth cookie, also try to remove any versioned variants
            if (name.includes('auth-token')) {
              const cookiePattern = getSupabaseCookiePattern();
              const allCookies = request.cookies.getAll();
              
              for (const cookie of allCookies) {
                if (cookie.name !== name && cookie.name.startsWith(cookiePattern)) {
                  console.log(`[Middleware] Also removing related auth cookie: ${cookie.name}`);
                  response.cookies.set({
                    name: cookie.name,
                    value: '',
                    path: options.path || '/',
                    maxAge: 0,
                  });
                }
              }
            }
          },
        },
      }
    )

    console.log(`[Middleware] Checking auth for path: ${pathname}`);
    
    // CRITICAL: This is the key part - we need to get the user from Supabase
    // using getUser() rather than getSession() to ensure the token is validated
    // and refreshed if needed
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error(`[Middleware] Error getting user: ${error.message}`);
      
      // Log more details about the error
      console.log(`[Middleware] Auth error context:`);
      console.log(`- Path: ${pathname}`);
      console.log(`- Has auth cookie: ${hasAuthCookie}`);
      console.log(`- Error type: ${error.name}`);
      console.log(`- Is API request: ${isApiRequest(request)}`);
      
      // Check if the error is due to an expired token
      const isExpiredTokenError = error.message.includes('expired') || 
                                  error.message.includes('JWT') || 
                                  error.message.includes('token');
      
      // Try to refresh the session on token expiration
      if (isExpiredTokenError && hasAuthCookie) {
        try {
          console.log(`[Middleware] Attempting to refresh expired token`);
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error(`[Middleware] Failed to refresh token: ${refreshError.message}`);
          } else if (refreshData?.session) {
            console.log(`[Middleware] Successfully refreshed token`);
            
            // If refresh succeeded for a protected route, allow the request to continue
            if (isProtectedRoute(pathname)) {
              return response;
            }
          }
        } catch (refreshException) {
          console.error(`[Middleware] Exception during token refresh: ${refreshException}`);
        }
      }
      
      // For API requests, return 401 instead of redirecting (better for client error handling)
      if (isApiRequest(request) && isProtectedRoute(pathname)) {
        console.log(`[Middleware] Returning 401 for API request to protected route: ${pathname}`);
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401, headers: response.headers }
        );
      }
      
      // For protected routes, redirect to login on error
      if (isProtectedRoute(pathname)) {
        console.log(`[Middleware] Redirecting to sign-in due to auth error on protected route: ${pathname}`);
        
        // We don't want to clear auth cookies here as it could be a temporary error
        // and clearing would force the user to re-login unnecessarily
        
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }
      
      // For non-protected routes, attach a header to indicate auth status
      // This can be checked by the client to conditionally render login elements
      response.headers.set('X-Auth-Status', 'invalid');
      return response
    }
    
    const user = data?.user
    
    if (user) {
      console.log(`[Middleware] Session found for user ${user.id.slice(0, 6)}... on ${pathname}`);
      
      // Set a header with the user ID for the backend to use
      response.headers.set('X-User-ID', user.id);
      response.headers.set('X-Auth-Status', 'valid');
      
      // Add user role to headers if available
      const userRole = user.app_metadata?.role || 'USER';
      response.headers.set('X-User-Role', userRole);
      
      // Check if the request is for an API route
      const isApiRoute = pathname.startsWith('/api/');
      
      // CRITICAL: For requests that come from the browser, we need to refresh the session
      // This will update the auth tokens and set cookies with the latest values
      if (!request.headers.get('authorization')) {
        try {
          console.log(`[Middleware] Refreshing session for browser request`);
          const { error: refreshError } = await supabase.auth.refreshSession()
          if (refreshError) {
            console.error(`[Middleware] Error refreshing session: ${refreshError.message}`)
          }
        } catch (e) {
          console.error(`[Middleware] Exception during session refresh: ${e}`);
        }
      }
      
      // For API routes with SUPERADMIN users, always allow them through
      // This is crucial to prevent middleware redirects for SUPERADMINs
      if (isApiRoute && userRole === 'SUPERADMIN') {
        console.log(`[Middleware] Allowing SUPERADMIN through to API: ${pathname}`);
        
        // Set content-type for API routes
        if (isApiRoute) {
          response.headers.set('Content-Type', 'application/json');
        }
        
        return response;
      }
    } else {
      console.log(`[Middleware] No session found for path ${pathname}`);
      
      // Set a header to indicate auth status
      response.headers.set('X-Auth-Status', 'none');
      
      // For API requests, return 401 instead of redirecting (better for client error handling)
      if (isApiRequest(request) && isProtectedRoute(pathname)) {
        console.log(`[Middleware] Returning 401 for API request to protected route: ${pathname}`);
        return NextResponse.json(
          { error: "Unauthorized", message: "Authentication required" },
          { status: 401, headers: response.headers }
        );
      }
      
      // If requesting a protected route, redirect to login
      if (isProtectedRoute(pathname)) {
        console.log(`[Middleware] Redirecting to sign-in from protected route: ${pathname}`);
        return NextResponse.redirect(new URL('/sign-in', request.url));
      }
    }

    // For API routes, ensure proper Content-Type header is set to avoid content encoding issues
    if (pathname.startsWith('/api/')) {
      response.headers.set('Content-Type', 'application/json');
    }

    return response
  } catch (error) {
    console.error(`[Middleware] Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.next();
  }
}

/**
 * Helper function to determine if a route requires authentication
 */
function isProtectedRoute(pathname: string): boolean {
  // API routes that require authentication
  if (pathname.startsWith('/api/')) {
    // Exclude public API routes
    return !(
      pathname.startsWith('/api/auth') ||
      pathname === '/api/health'
    );
  }

  // Dashboard and other protected front-end routes
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/company-selection') ||
    pathname.startsWith('/waiting-approval') ||
    pathname.startsWith('/admin')
  )
} 