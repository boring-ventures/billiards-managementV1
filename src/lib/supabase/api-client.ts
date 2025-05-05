/**
 * Standardized Supabase client creation for API routes
 * This ensures consistent authentication handling across all API endpoints
 */
import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseCookiePattern } from './client';
import { User } from '@supabase/supabase-js';
import { headers } from 'next/headers';

// Define common response creation utility
export function createJsonResponse(data: any, status: number = 200) {
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'application/json');
  
  return new NextResponse(
    JSON.stringify(data),
    { 
      status,
      headers: responseHeaders
    }
  );
}

/**
 * Find auth cookies in a request
 */
export function findAuthCookies(request: NextRequest): Array<{ name: string, value: string }> {
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
    
    console.log(`[API] Found ${authCookies.length} auth cookies with pattern '${cookiePattern}'`);
    if (authCookies.length > 0) {
      console.log(`[API] Auth cookie names: ${authCookies.map(c => c.name).join(', ')}`);
    } else {
      // Log all cookies for debugging if no auth cookies found
      console.log(`[API] No auth cookies found. All cookies: ${cookies.map(c => c.name).join(', ')}`);
    }
    
    return authCookies;
  } catch (error) {
    console.error(`[API] Error finding auth cookies:`, error);
    return [];
  }
}

/**
 * Standard authentication error handler for API routes
 */
export function handleAuthError(error: any, message: string = "Authentication failed") {
  console.error(`[API] Auth error: ${error?.message || 'Unknown error'}`);
  return createJsonResponse({ 
    error: "Not authenticated", 
    detail: error?.message || message
  }, 401);
}

/**
 * Standard authorization error handler for API routes
 */
export function handleAuthorizationError(message: string = "Insufficient permissions") {
  console.error(`[API] Authorization error: ${message}`);
  return createJsonResponse({ 
    error: "Forbidden", 
    detail: message 
  }, 403);
}

/**
 * Create standardized Supabase client for API routes
 * @param request NextRequest object from the API route handler
 */
export function createStandardApiClient(request: NextRequest) {
  const cookiePattern = getSupabaseCookiePattern();
  console.log(`[API] Creating standardized API client with cookie pattern: ${cookiePattern}`);
  
  // Debug all request cookies to identify potential issues
  const allRequestCookies = request.cookies.getAll();
  console.log(`[API] All request cookies (${allRequestCookies.length}): ${allRequestCookies.map(c => c.name).join(', ')}`);
  
  // Log specifically auth-related cookies
  const authCookies = findAuthCookies(request);
  
  if (authCookies.length === 0) {
    console.log(`[API] ⚠️ WARNING: No auth cookies found in request. Authentication will likely fail.`);
    // Check headers for debug purposes
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      console.log(`[API] Found Authorization header: ${authHeader.substring(0, 15)}...`);
    }
  } else {
    console.log(`[API] Found ${authCookies.length} auth cookie(s): ${authCookies.map(c => c.name).join(', ')}`);
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // Log that we're looking for this specific cookie with more details
          if (name.includes('auth') || name.includes('supabase')) {
            console.log(`[API] Looking for cookie: ${name}`);
          }
          
          // First try the exact cookie name with more detailed logging
          const cookie = request.cookies.get(name);
          if (cookie) {
            console.log(`[API] Found exact cookie match: ${name} = ${cookie.value.substring(0, 15)}...`);
            return cookie.value;
          }
          
          // If it's an auth token and not found, try to find any auth token cookie
          if (name === cookiePattern || name.startsWith(cookiePattern)) {
            // More detailed logging
            console.log(`[API] Exact cookie not found, looking for alternate auth cookies: ${name}`);
            
            // Always look through all cookies rather than using cached results
            const freshAuthCookies = findAuthCookies(request);
            if (freshAuthCookies.length > 0) {
              console.log(`[API] Using alternative auth cookie: ${freshAuthCookies[0].name} instead of ${name}`);
              return freshAuthCookies[0].value;
            } else {
              console.log(`[API] ⚠️ No auth cookies found when looking for ${name}`);
            }
          }
          
          // Check for authorization header as a fallback
          const authHeader = request.headers.get('authorization');
          if (authHeader && authHeader.startsWith('Bearer ') && name.includes('auth-token')) {
            const token = authHeader.replace('Bearer ', '');
            console.log(`[API] Using token from Authorization header instead of cookie`);
            return token;
          }
          
          console.log(`[API] Cookie not found: ${name}`);
          return null;
        },
        set(name, value, options) {
          // API routes should return cookies in the response headers
          // This will be handled externally by the response object
          console.log(`[API] Note: Cookie '${name}' set attempted in API route (handled externally)`);
        },
        remove(name, options) {
          // API routes should handle cookie removal in response headers
          // This will be handled externally
          console.log(`[API] ⚠️ Cookie removal '${name}' attempted in API route client. This should only happen during logout.`);
        }
      }
    }
  );
}

/**
 * Standard authentication flow for API routes
 * This consolidates the pattern of getting the authenticated user and handling errors
 */
export async function authenticateApiRequest(request: NextRequest): Promise<{ 
  user: User | null; 
  error: NextResponse | null;
}> {
  try {
    // Create the standardized client
    const supabase = createStandardApiClient(request);
    
    // Attempt to get the authenticated user
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error(`[API] Authentication error: ${error.message}`);
      return { 
        user: null, 
        error: handleAuthError(error) 
      };
    }
    
    if (!data?.user) {
      console.log(`[API] No user found in session`);
      return { 
        user: null, 
        error: handleAuthError(null, "No user found in session") 
      };
    }
    
    console.log(`[API] Successfully authenticated user: ${data.user.id}`);
    return { user: data.user, error: null };
    
  } catch (error) {
    console.error(`[API] Unexpected error during authentication:`, error);
    return { 
      user: null, 
      error: createJsonResponse({ 
        error: "Authentication failed", 
        detail: error instanceof Error ? error.message : "Unexpected error" 
      }, 500) 
    };
  }
}

/**
 * Helper to attempt session refresh in API routes
 * Can be used to recover from expired tokens
 */
export async function tryRefreshSession(request: NextRequest) {
  try {
    const supabase = createStandardApiClient(request);
    console.log(`[API] Attempting to refresh token`);
    
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error(`[API] Failed to refresh token: ${error.message}`);
      return { success: false, error };
    }
    
    if (data?.session) {
      console.log(`[API] Successfully refreshed token`);
      return { success: true, session: data.session };
    }
    
    return { success: false, error: new Error("No session returned from refresh") };
  } catch (refreshError) {
    console.error(`[API] Exception during token refresh:`, refreshError);
    return { success: false, error: refreshError };
  }
} 