/**
 * Authentication utilities for server-side code
 * 
 * IMPORTANT: This file is SERVER-ONLY and should NEVER be imported in client components.
 * Instead, use the client-safe functions from supabase/client.ts
 */
import 'server-only'; // Mark this module as server-only
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, type NextResponse } from 'next/server'
import { AUTH_TOKEN_KEY } from './auth-client-utils'

// Define a more specific type for the cookies store
type CookieStore = {
  get: (name: string) => { name: string; value: string } | undefined;
  getAll: () => Array<{ name: string; value: string }>;
};

/**
 * Get the base Supabase auth cookie name for the current project
 * This is critical because Supabase uses multiple cookie names with version suffixes
 */
export function getSupabaseCookiePattern(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = supabaseUrl?.match(/([^/]+)\.supabase\.co/)?.[1] || 'unknown'
  return `sb-${projectRef}-auth-token`;
}

/**
 * Utility to get all auth-related cookies from a request or cookie store
 */
export function getAllAuthCookies(
  requestOrStore: NextRequest | ReturnType<typeof cookies>
): Array<{name: string, value: string}> {
  try {
    // Determine cookie pattern to match
    const cookiePrefix = getSupabaseCookiePattern();
    console.log(`[Cookie] Looking for auth cookies with pattern: ${cookiePrefix}`);
    
    // Get cookies from either NextRequest or cookie store
    let allCookies: Array<{name: string, value: string}> = [];
    
    if ('cookies' in requestOrStore && typeof requestOrStore.cookies.getAll === 'function') {
      // It's a NextRequest
      allCookies = requestOrStore.cookies.getAll();
    } else {
      // It's a cookie store from next/headers - treat it as our CookieStore type
      const cookieStore = requestOrStore as unknown as CookieStore;
      try {
        allCookies = cookieStore.getAll();
      } catch (error) {
        console.error('[Cookie] Error getting all cookies:', error);
      }
    }
    
    // Filter to auth cookies and create a standardized format
    const authCookies = allCookies
      .filter(cookie => cookie.name.startsWith(cookiePrefix))
      .map(cookie => ({
        name: cookie.name,
        value: cookie.value,
      }));
      
    console.log(`[Cookie] Found ${authCookies.length} auth cookies`);
    if (authCookies.length > 0) {
      console.log(`[Cookie] Auth cookie names: ${authCookies.map(c => c.name).join(', ')}`);
    }
    
    return authCookies;
  } catch (error) {
    console.error(`[Cookie] Error getting auth cookies:`, error);
    return [];
  }
}

/**
 * Create a Supabase server client with cookie handling for server components
 * Specifically designed for Next.js 14 where cookies() returns the store directly
 */
export function createServerSupabaseClient() {
  const cookiePattern = getSupabaseCookiePattern();
  console.log(`[Server] Creating server client with cookie pattern: ${cookiePattern}`);
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          try {
            // Cast cookies() to our more specific type
            const cookieStore = cookies() as unknown as CookieStore;
            
            // Log that we're looking for this specific cookie
            if (name.includes('auth') || name.includes('supabase')) {
              console.log(`[Server] Looking for cookie: ${name}`);
            }
            
            // First try the exact cookie name
            const cookie = cookieStore.get(name);
            if (cookie) {
              console.log(`[Server] Found exact cookie match: ${name}`);
              return cookie.value;
            }
            
            // If it's an auth token and not found, try to find any auth token cookie
            // This helps with versioned cookie names (e.g., sb-xxx-auth-token.4)
            if (name === AUTH_TOKEN_KEY || name.startsWith(cookiePattern)) {
              const authCookies = getAllAuthCookies(cookieStore as unknown as ReturnType<typeof cookies>);
              if (authCookies.length > 0) {
                console.log(`[Server] Using alternative auth cookie: ${authCookies[0].name}`);
                return authCookies[0].value;
              }
            }
            
            console.log(`[Server] Cookie not found: ${name}`);
            return null;
          } catch (error) {
            console.error('[Cookie] Error reading cookie:', error);
            return null;
          }
        },
        set() {
          // Cannot set cookies in server components
          // This will be handled by middleware
        },
        remove() {
          // Cannot remove cookies in server components
          // This will be handled by middleware
        }
      }
    }
  )
}

/**
 * Create a Supabase server client with explicit cookie access for API routes
 * This version is optimized for API routes where cookie access is different
 * @param request The NextRequest object from the API route
 */
export function createAPIRouteClient(request: NextRequest) {
  const cookiePattern = getSupabaseCookiePattern();
  console.log(`[API] Creating API route client with cookie pattern: ${cookiePattern}`);
  
  // Debug all request cookies to identify potential issues
  const allRequestCookies = request.cookies.getAll();
  console.log(`[API] All request cookies (${allRequestCookies.length}): ${allRequestCookies.map(c => c.name).join(', ')}`);
  
  // Log specifically auth-related cookies
  const authCookies = getAllAuthCookies(request);
  
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
          if (name === AUTH_TOKEN_KEY || name.startsWith(cookiePattern)) {
            // More detailed logging
            console.log(`[API] Exact cookie not found, looking for alternate auth cookies: ${name}`);
            
            // Always look through all cookies rather than using cached results
            const freshAuthCookies = getAllAuthCookies(request);
            if (freshAuthCookies.length > 0) {
              console.log(`[API] Using alternative auth cookie: ${freshAuthCookies[0].name} instead of ${name}`);
              return freshAuthCookies[0].value;
            } else {
              console.log(`[API] ⚠️ No auth cookies found when looking for ${name}`);
            }
          }
          
          console.log(`[API] Cookie not found: ${name}`);
          return null;
        },
        set() {
          // API routes should return cookies in the response headers
          // This will be handled externally
          console.log(`[API] Attempted to set cookie in API route (will be handled by response)`);
        },
        remove() {
          // API routes should handle cookie removal in response headers
          // This will be handled externally
          console.log(`[API] ⚠️ Attempted to remove cookie in API route client. This should only happen during logout.`);
        }
      }
    }
  )
}

/**
 * Create a Supabase server client for use in middleware
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  const cookiePattern = getSupabaseCookiePattern();
  console.log(`[Middleware] Creating middleware client with cookie pattern: ${cookiePattern}`);
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Log that we're looking for this specific cookie
          if (name.includes('auth') || name.includes('supabase')) {
            console.log(`[Middleware] Looking for cookie: ${name}`);
          }
          
          // First try the exact cookie name
          const cookie = request.cookies.get(name);
          if (cookie) {
            console.log(`[Middleware] Found exact cookie match: ${name}`);
            return cookie.value;
          }
          
          // If it's an auth token and not found, try to find any auth token cookie
          if (name === AUTH_TOKEN_KEY || name.startsWith(cookiePattern)) {
            const authCookies = getAllAuthCookies(request);
            if (authCookies.length > 0) {
              console.log(`[Middleware] Using alternative auth cookie: ${authCookies[0].name}`);
              return authCookies[0].value;
            }
          }
          
          console.log(`[Middleware] Cookie not found: ${name}`);
          return null;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
            sameSite: options.sameSite || 'lax',
            path: options.path || '/',
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            path: options.path || '/',
            maxAge: 0,
          });
        }
      }
    }
  )
}

/**
 * Validate auth session on the server side
 * Uses getUser() for reliable authentication validation
 */
export async function validateSession() {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser()
    
    if (error || !data.user) {
      return { user: null, error: error?.message || 'No active session' }
    }
    
    return { user: data.user, error: null }
  } catch (error) {
    console.error('Error validating session:', error)
    return { user: null, error: 'Error validating session' }
  }
}

/**
 * Comprehensive function to get the current authenticated user
 * with detailed profile information from the database
 */
export async function getCurrentUser() {
  try {
    const supabase = createServerSupabaseClient();
    
    // First, get the basic user info from Supabase Auth
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      console.log('[Server] No authenticated user found');
      return { 
        user: null, 
        profile: null, 
        error: userError?.message || 'No authenticated user' 
      };
    }
    
    const user = userData.user;
    console.log(`[Server] Found authenticated user: ${user.id}`);
    
    // Then, try to fetch the user's profile from the database
    try {
      // Make a fetch request to our own API to get the profile
      const profileUrl = new URL('/api/profile', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
      
      // Create headers with the auth token to pass auth to the API
      // Cast cookies() to our CookieStore type
      const cookieStore = cookies() as unknown as CookieStore;
      const authCookies = getAllAuthCookies(cookieStore as unknown as ReturnType<typeof cookies>);
      const cookieHeader = authCookies
        .map(cookie => `${cookie.name}=${cookie.value}`)
        .join('; ');
      
      const response = await fetch(profileUrl, {
        headers: {
          'Cookie': cookieHeader
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error(`[Server] Error fetching profile: ${response.status} ${response.statusText}`);
        // Return the user without profile
        return { user, profile: null, error: null };
      }
      
      const profileData = await response.json();
      
      if (profileData?.profile) {
        console.log(`[Server] Successfully fetched profile for user: ${user.id}`);
        return { 
          user, 
          profile: profileData.profile, 
          error: null 
        };
      } else {
        console.log(`[Server] No profile found for user: ${user.id}`);
        return { user, profile: null, error: null };
      }
    } catch (profileError) {
      console.error('[Server] Error fetching profile:', profileError);
      // Still return the user even if profile fetch failed
      return { 
        user, 
        profile: null, 
        error: profileError instanceof Error ? profileError.message : String(profileError)
      };
    }
  } catch (error) {
    console.error('[Server] Error in getCurrentUser:', error);
    return { 
      user: null, 
      profile: null, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Debug utility to log current cookies 
 */
export async function debugServerCookies() {
  if (typeof window !== 'undefined') return 'Cannot debug server cookies on client'
  
  try {
    // Cast cookies() to our CookieStore type
    const cookieStore = cookies() as unknown as CookieStore;
    const authCookies = getAllAuthCookies(cookieStore as unknown as ReturnType<typeof cookies>);
    
    return {
      hasAuthCookies: authCookies.length > 0,
      authCookieNames: authCookies.map(c => c.name),
      authCookieCount: authCookies.length,
      allCookieCount: cookieStore.getAll().length
    }
  } catch (error) {
    return { error: 'Error reading cookies' }
  }
}