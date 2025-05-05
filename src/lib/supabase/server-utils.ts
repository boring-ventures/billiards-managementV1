import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseCookiePattern } from '@/lib/supabase/client';

/**
 * Finds all authentication-related cookies in a request
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
    
    return authCookies;
  } catch (error) {
    console.error(`[Error] Finding auth cookies:`, error);
    return [];
  }
}

/**
 * Create a standardized Supabase client for server components and API routes
 * with consistent, robust cookie handling.
 * 
 * This should be the primary way to create a Supabase client on the server.
 */
export function createServerSupabaseClient(requestOrResponse?: NextRequest | NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  // Handle cases with NextRequest
  if (requestOrResponse && 'cookies' in requestOrResponse) {
    const request = requestOrResponse as NextRequest;
    const authCookies = findAuthCookies(request);
    
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            // First try exact cookie match
            const cookie = request.cookies.get(name);
            if (cookie?.value) {
              return cookie.value;
            }
            
            // If looking for an auth cookie and not found, try to find an alternative
            const cookiePattern = getSupabaseCookiePattern();
            if (name.startsWith(cookiePattern) || name.includes('auth-token')) {
              // If we have any auth cookie, return the first one's value
              if (authCookies.length > 0) {
                return authCookies[0].value;
              }
            }
            
            return null;
          },
          set(name: string, value: string, options: any) {
            // API routes don't need to set cookies in most cases
            // This is handled by the middleware or specific handlers
          },
          remove(name: string, options: any) {
            // API routes don't need to remove cookies in most cases
            // This is handled by the middleware or specific handlers
          }
        }
      }
    );
  }

  // Handle standard Server Component case using the global cookies()
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          try {
            const cookieStore = cookies();
            const value = cookieStore.get(name)?.value || null;
            return value;
          } catch (error) {
            console.error('[Error] Reading cookie:', error);
            return null;
          }
        },
        set(name: string, value: string, options: any) {
          try {
            const cookieStore = cookies();
            cookieStore.set(name, value, options);
          } catch (error) {
            console.error('[Error] Setting cookie:', error);
          }
        },
        remove(name: string, options: any) {
          try {
            const cookieStore = cookies();
            cookieStore.delete(name, options);
          } catch (error) {
            console.error('[Error] Removing cookie:', error);
          }
        }
      }
    }
  );
}

/**
 * Creates a Supabase client specifically for route handlers
 * with enhanced error logging and robust cookie reading
 */
export function createSupabaseRouteHandlerClient(request: NextRequest) {
  return createServerSupabaseClient(request);
}

/**
 * Refresh the user's session in an API route
 * Returns the updated session if successful
 */
export async function refreshSessionInApiRoute(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request);
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Auth] Error refreshing session:', error);
      return null;
    }
    
    if (!data.session) {
      return null;
    }
    
    // Try to refresh if session exists
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.error('[Auth] Error refreshing token:', refreshError);
      return data.session; // Return original session if refresh fails
    }
    
    return refreshData.session;
  } catch (error) {
    console.error('[Auth] Unexpected error refreshing session:', error);
    return null;
  }
}

/**
 * Helper to safely get all cookies in both async and sync contexts
 */
export async function getAllCookies() {
  const cookieStore = cookies();
  let allCookies: any[] = [];
  
  try {
    // Try async API first
    const cookieStoreResult = await cookieStore;
    allCookies = cookieStoreResult.getAll();
  } catch (err) {
    // Fallback to sync API
    // @ts-ignore - Access sync API
    allCookies = cookieStore.getAll?.() || [];
  }
  
  return allCookies;
} 