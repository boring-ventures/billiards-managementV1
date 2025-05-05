/**
 * Authentication utilities for server-side code
 * 
 * IMPORTANT: This file is SERVER-ONLY and should NEVER be imported in client components.
 * Instead, use the client-safe functions from supabase/client.ts
 */
import 'server-only'; // Mark this module as server-only
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { AUTH_TOKEN_KEY } from './auth-client-utils'
import { Session, User } from '@supabase/supabase-js'
import { UserRole } from '@prisma/client'
import prisma from '@/lib/prisma'
import { RequestCookie, ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

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
 * Utility to safely get cookie value from the cookie store
 */
function getCookieFromStore(name: string): { name: string; value: string } | undefined {
  try {
    // Access cookies synchronously
    const cookieStore = cookies();
    // @ts-ignore - Access sync API
    return cookieStore.get?.(name);
  } catch (error) {
    console.error(`[Cookie] Error getting cookie from store:`, error);
    return undefined;
  }
}

/**
 * Utility to safely set cookie in the cookie store
 */
function setCookieInStore(name: string, value: string, options: any): void {
  try {
    // Access cookies synchronously
    const cookieStore = cookies();
    // @ts-ignore - Access sync API
    cookieStore.set?.(name, value, options);
  } catch (error) {
    console.error(`[Cookie] Error setting cookie in store:`, error);
  }
}

/**
 * Utility to safely delete cookie from the cookie store
 */
function deleteCookieFromStore(name: string, options: any): void {
  try {
    // Access cookies synchronously
    const cookieStore = cookies();
    // @ts-ignore - Access sync API
    cookieStore.delete?.(name, options);
  } catch (error) {
    console.error(`[Cookie] Error deleting cookie from store:`, error);
  }
}

/**
 * Get all cookies from a cookie store synchronously
 */
function getAllCookiesFromStore(): Array<{ name: string; value: string }> {
  try {
    const cookieStore = cookies();
    // @ts-ignore - Access sync API
    const allCookies = cookieStore.getAll?.() || [];
    return allCookies.map((cookie: { name: string; value: string }) => ({
      name: cookie.name,
      value: cookie.value
    }));
  } catch (error) {
    console.error(`[Cookie] Error getting all cookies:`, error);
    return [];
  }
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
      // It's a cookie store from next/headers - get all cookies
      allCookies = getAllCookiesFromStore();
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
 * Determines if the current request path indicates a sign-out operation
 * Used to prevent accidental cookie removal outside sign-out flows
 */
function isSignOutOperation(requestPath?: string): boolean {
  if (!requestPath) return false;
  
  // Check if the request path indicates a sign-out operation
  return (
    requestPath.includes('/sign-out') ||
    requestPath.includes('/signout') ||
    requestPath.includes('/logout') ||
    requestPath.includes('/auth/signout') ||
    requestPath.includes('/api/auth/signout')
  );
}

/**
 * MAIN STANDARDIZED UTILITY: Create a Supabase server client with consistent cookie handling
 * Works across all Next.js server contexts: Server Components, API Routes, Middleware
 * 
 * This is the SINGLE, DEFINITIVE way to create a server-side Supabase client 
 * with cookie access in this application.
 */
export function createSupabaseServerClient(
  requestOrResponse?: NextRequest | NextResponse,
  options: {
    isSignOutFlow?: boolean; // Explicitly mark as sign-out flow to allow cookie removal
  } = {}
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const cookiePattern = getSupabaseCookiePattern();
  
  console.log(`[Supabase] Creating standardized server client with cookie pattern: ${cookiePattern}`);
  
  // Detect request context to determine how to handle cookies
  const isNextRequest = requestOrResponse && 'cookies' in requestOrResponse && typeof (requestOrResponse as any).cookies?.get === 'function';
  const requestPath = isNextRequest ? (requestOrResponse as NextRequest).nextUrl?.pathname : undefined;
  
  // Explicitly set sign-out flow flag or determine from request path
  const isSignOutFlow = options.isSignOutFlow || isSignOutOperation(requestPath);
  
  if (isSignOutFlow) {
    console.log(`[Supabase] Creating client for sign-out flow - allowing cookie removal`);
  }
  
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name) {
          console.log(`[Cookie:GET] Looking for cookie: ${name}`);
          
          try {
            // Handle NextRequest context (API Routes, Middleware)
            if (isNextRequest) {
              const request = requestOrResponse as NextRequest;
              
              // First try to get the exact cookie
              const cookie = request.cookies.get(name);
              if (cookie) {
                console.log(`[Cookie:GET] Found exact cookie in request: ${name}`);
                return cookie.value;
              }
              
              // For auth-related cookies, search for alternatives if exact match not found
              if (name === AUTH_TOKEN_KEY || name.startsWith(cookiePattern)) {
                const authCookies = getAllAuthCookies(request);
                if (authCookies.length > 0) {
                  console.log(`[Cookie:GET] Using alternative auth cookie: ${authCookies[0].name} instead of ${name}`);
                  return authCookies[0].value;
                }
              }
            } 
            // Handle Server Component context
            else {
              // First try to get the exact cookie
              const cookie = getCookieFromStore(name);
              if (cookie) {
                console.log(`[Cookie:GET] Found exact cookie in cookie store: ${name}`);
                return cookie.value;
              }
              
              // For auth-related cookies, search for alternatives if exact match not found
              if (name === AUTH_TOKEN_KEY || name.startsWith(cookiePattern)) {
                const authCookies = getAllCookiesFromStore()
                  .filter(cookie => cookie.name.startsWith(cookiePattern));
                  
                if (authCookies.length > 0) {
                  console.log(`[Cookie:GET] Using alternative auth cookie: ${authCookies[0].name} instead of ${name}`);
                  return authCookies[0].value;
                }
              }
            }
            
            console.log(`[Cookie:GET] Cookie not found: ${name}`);
            return null;
          } catch (error) {
            console.error(`[Cookie:GET] Error getting cookie ${name}:`, error);
            return null;
          }
        },
        
        set(name, value, options) {
          console.log(`[Cookie:SET] Setting cookie: ${name}`);
          
          try {
            // Handle NextRequest context (middleware)
            if (requestOrResponse && 'cookies' in requestOrResponse && typeof (requestOrResponse as any).cookies?.set === 'function') {
              const response = requestOrResponse as any;
              response.cookies.set(name, value, options);
              console.log(`[Cookie:SET] Set cookie in response: ${name}`);
              return;
            }
            
            // Handle Server Component context
            setCookieInStore(name, value, options);
            console.log(`[Cookie:SET] Set cookie in cookie store: ${name}`);
          } catch (error) {
            console.error(`[Cookie:SET] Error setting cookie ${name}:`, error);
          }
        },
        
        remove(name, options) {
          console.log(`[Cookie:REMOVE] Attempt to remove cookie: ${name}`);
          
          // CRITICAL: Prevent cookie removal if not in a sign-out flow
          if (!isSignOutFlow && (name === AUTH_TOKEN_KEY || name.startsWith(cookiePattern))) {
            console.log(`[Cookie:REMOVE] ⚠️ PREVENTED removal of auth cookie ${name} - not in sign-out flow`);
            return;
          }
          
          try {
            // Handle NextRequest context (middleware)
            if (requestOrResponse && 'cookies' in requestOrResponse && typeof (requestOrResponse as any).cookies?.delete === 'function') {
              const response = requestOrResponse as any;
              response.cookies.delete(name);
              console.log(`[Cookie:REMOVE] Removed cookie from response: ${name}`);
              return;
            }
            
            // Handle Server Component context
            deleteCookieFromStore(name, options);
            console.log(`[Cookie:REMOVE] Removed cookie from cookie store: ${name}`);
          } catch (error) {
            console.error(`[Cookie:REMOVE] Error removing cookie ${name}:`, error);
          }
        }
      }
    }
  );
}

/**
 * @deprecated Use createSupabaseServerClient() instead
 * This is maintained for backward compatibility during refactoring
 */
export function createServerSupabaseClient() {
  console.log(`[Server] DEPRECATED: Using legacy createServerSupabaseClient. Please migrate to createSupabaseServerClient()`);
  return createSupabaseServerClient();
}

/**
 * @deprecated Use createSupabaseServerClient(request) instead
 * This is maintained for backward compatibility during refactoring
 */
export function createAPIRouteClient(request: NextRequest) {
  console.log(`[API] DEPRECATED: Using legacy createAPIRouteClient. Please migrate to createSupabaseServerClient(request)`);
  return createSupabaseServerClient(request);
}

/**
 * @deprecated Use createSupabaseServerClient(request, response) instead
 * This is maintained for backward compatibility during refactoring
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  console.log(`[Middleware] DEPRECATED: Using legacy createMiddlewareClient. Please migrate to createSupabaseServerClient(request, response)`);
  return createSupabaseServerClient(request);
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

/**
 * Type for authenticated API handlers
 */
export type AuthenticatedHandler = (
  req: NextRequest,
  context: { 
    user: User; 
    session: Session;
    isSuperAdmin: boolean;
    effectiveCompanyId?: string;
  }
) => Promise<NextResponse>;

/**
 * Check if the user is a SUPERADMIN based on metadata
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  
  // Check in app_metadata first (most reliable)
  if (user.app_metadata?.role === UserRole.SUPERADMIN) {
    return true;
  }
  
  // Fallback to user_metadata if needed
  if (user.user_metadata?.role === UserRole.SUPERADMIN) {
    return true;
  }
  
  return false;
}

/**
 * Get the effective company ID for a user
 * SUPERADMINs can use any company ID, others must use their assigned company
 */
export async function getEffectiveCompanyId(
  userId: string,
  requestedCompanyId?: string | null
): Promise<string | null> {
  try {
    // Get user profile to determine role and assigned company
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { companyId: true, role: true }
    });
    
    if (!profile) {
      console.log(`[Auth] No profile found for user ${userId}`);
      return null;
    }
    
    // SUPERADMINs can specify a company ID or fall back to their assigned company
    if (profile.role === UserRole.SUPERADMIN) {
      const effectiveId = requestedCompanyId || profile.companyId;
      
      if (requestedCompanyId) {
        console.log(`[Auth] SUPERADMIN ${userId} using specified company ${requestedCompanyId}`);
      } else if (profile.companyId) {
        console.log(`[Auth] SUPERADMIN ${userId} using assigned company ${profile.companyId}`);
      } else {
        console.log(`[Auth] SUPERADMIN ${userId} has no effective company ID`);
      }
      
      return effectiveId;
    }
    
    // Normal users must use their assigned company
    if (requestedCompanyId && requestedCompanyId !== profile.companyId) {
      console.log(`[Auth] User ${userId} cannot access company ${requestedCompanyId}, restricted to ${profile.companyId}`);
      return null;
    }
    
    console.log(`[Auth] User ${userId} using assigned company ${profile.companyId}`);
    return profile.companyId;
  } catch (error) {
    console.error('[Auth] Error getting effective company ID:', error);
    return null;
  }
}

/**
 * Wrapper for API route handlers that require authentication
 * This ensures consistent authentication and authorization handling
 */
export function withAuth(handler: AuthenticatedHandler, options: { requireCompanyId?: boolean } = {}) {
  return async function(req: NextRequest): Promise<NextResponse> {
    try {
      // Create a standardized Supabase client
      const supabase = createServerSupabaseClient(req);
      
      // Get and possibly refresh the session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[Auth] Session error:', sessionError);
        return NextResponse.json({ error: 'Authentication error', details: sessionError.message }, { status: 401 });
      }
      
      if (!sessionData.session) {
        console.log('[Auth] No active session found');
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
      }
      
      // Try to refresh the token if needed
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (!refreshError && refreshData.session) {
          // Use the refreshed session
          sessionData.session = refreshData.session;
        }
      } catch (refreshError) {
        console.warn('[Auth] Token refresh failed, continuing with existing token:', refreshError);
        // Continue with the existing token
      }
      
      const { user } = sessionData.session;
      
      // Attach SUPERADMIN flag
      const superAdmin = isSuperAdmin(user);
      
      // Get effective company ID if requested in URL
      const url = new URL(req.url);
      const requestedCompanyId = url.searchParams.get('companyId');
      
      let effectiveCompanyId: string | undefined | null = undefined;
      
      // If company ID is required for this endpoint
      if (options.requireCompanyId) {
        effectiveCompanyId = await getEffectiveCompanyId(user.id, requestedCompanyId);
        
        if (!effectiveCompanyId) {
          return NextResponse.json({ error: 'No valid company context' }, { status: 403 });
        }
      }
      
      // Hand off to the actual handler with auth context
      return handler(req, { 
        user, 
        session: sessionData.session,
        isSuperAdmin: superAdmin,
        effectiveCompanyId: effectiveCompanyId || undefined
      });
      
    } catch (error) {
      console.error('[Auth] Unexpected error in auth wrapper:', error);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

/**
 * Function to create server supabase admin client (with service role key)
 * To be used for operations that need elevated privileges
 */
export function createServerSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing required environment variables for admin client');
  }
  
  return createServerClient(
    supabaseUrl, 
    supabaseServiceKey, 
    {
      cookies: {
        get: () => null, // Admin client doesn't need cookies
        set: () => {},   // Admin client doesn't set cookies
        remove: () => {} // Admin client doesn't remove cookies
      },
      auth: {
        persistSession: false // Don't persist admin sessions
      }
    }
  );
}