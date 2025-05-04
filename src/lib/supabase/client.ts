import { createBrowserClient } from '@supabase/ssr'
import type { Database } from "@/types/database.types";
import { getSupabaseCookiePattern } from '@/lib/auth-server-utils';

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

/**
 * CANONICAL SUPABASE CLIENT
 * 
 * This is the ONLY place in the entire application where Supabase client instances
 * should be created. All other files should import from here.
 */

// Create eager instance for the browser
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

// Track initialization status to avoid multiple simultaneous attempts
let initializationInProgress = false;

/**
 * Find all auth-related cookies in the browser
 */
function findBrowserAuthCookies(): string[] {
  if (typeof document === 'undefined') return [];
  
  try {
    const cookiePattern = getSupabaseCookiePattern();
    const cookies = document.cookie.split(';').map(c => c.trim());
    
    // Filter to auth cookies
    const authCookies = cookies
      .filter(cookie => {
        const name = cookie.split('=')[0];
        return name.startsWith(cookiePattern) || name.includes('auth-token');
      })
      .map(cookie => cookie.split('=')[0]);
    
    if (authCookies.length > 0) {
      console.log(`[Browser] Found ${authCookies.length} auth cookies: ${authCookies.join(', ')}`);
    } else {
      console.log(`[Browser] No auth cookies found with pattern: ${cookiePattern}`);
    }
    
    return authCookies;
  } catch (error) {
    console.error(`[Browser] Error finding auth cookies:`, error);
    return [];
  }
}

/**
 * Initialize the browser client with proper error handling
 */
function initializeBrowserClient() {
  // Prevent multiple simultaneous initialization attempts
  if (browserClientInstance || initializationInProgress) return browserClientInstance;
  
  try {
    initializationInProgress = true;
    console.log('[Browser] Creating Supabase client instance');
    
    // Check for auth cookies to set proper initialization options
    const hasAuthCookies = findBrowserAuthCookies().length > 0;
    
    browserClientInstance = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: 'pkce'  // More secure flow type
        },
        global: {
          fetch: (...args) => {
            // Add retry logic to fetch requests
            const doFetch = async (retries = 3, backoff = 300) => {
              try {
                const response = await fetch(...args);
                
                // Detect specific auth errors that might need token refresh
                if (response.status === 401) {
                  console.log("[Browser] Detected 401 response, might need token refresh");
                  
                  // Let the auth system handle this naturally
                  // The browser client will handle token refresh
                }
                
                return response;
              } catch (error) {
                if (retries === 0) throw error;
                
                console.warn(`[Browser] Fetch error, retrying (${retries} remaining):`, error);
                await new Promise(resolve => setTimeout(resolve, backoff));
                return doFetch(retries - 1, backoff * 1.5);
              }
            };
            
            return doFetch();
          }
        }
      }
    );
    
    // Verify that the client is initialized and functional
    if (browserClientInstance && typeof browserClientInstance.auth?.getSession === 'function') {
      console.log('[Browser] Supabase client successfully initialized');
      
      // If we detected auth cookies, immediately check auth state
      if (hasAuthCookies) {
        // Schedule an immediate session check
        setTimeout(async () => {
          try {
            console.log('[Browser] Performing initial session check');
            const { data, error } = await browserClientInstance!.auth.getSession();
            
            if (error) {
              console.error('[Browser] Session check error:', error);
            } else if (data.session) {
              console.log('[Browser] Valid session detected');
            } else {
              console.log('[Browser] No active session found despite cookies');
            }
          } catch (e) {
            console.error('[Browser] Error during initial session check:', e);
          }
        }, 0);
      }
    } else {
      console.error('[Browser] Supabase client initialization issue - auth functions missing');
      browserClientInstance = null;
    }
  } catch (error) {
    console.error('[Browser] Error creating Supabase client during initialization:', error);
    browserClientInstance = null;
  } finally {
    initializationInProgress = false;
  }
  
  return browserClientInstance;
}

// Create instance immediately on module load for client environments
if (typeof window !== 'undefined') {
  initializeBrowserClient();
}

/**
 * Get a singleton instance of Supabase client using the SSR package
 * This is the preferred way to access the Supabase client in any context
 * 
 * In SSR context, this returns a placeholder client that will be replaced during hydration
 */
export const getSupabaseClient = () => {
  // On the browser, use/create the singleton instance
  if (typeof window !== 'undefined') {
    // If we already have an instance, return it
    if (browserClientInstance) {
      return browserClientInstance;
    }
    
    // Otherwise initialize a new instance
    return initializeBrowserClient() || createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );
  }
  
  // In SSR context, return a new instance each time
  // This won't persist sessions but works for SSR without errors
  console.log('[SSR] Creating placeholder Supabase client');
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
};

// Ensure we have an instance that can be referenced directly
// This is used for convenience and to prevent "undefined" errors
export const supabase = (() => {
  // For client-side
  if (typeof window !== 'undefined') {
    return () => browserClientInstance || getSupabaseClient();
  }
  
  // For server-side
  return getSupabaseClient;
})();

/**
 * Get current session data from the Supabase client
 * This may trigger a refresh if the token is expired
 */
export async function getCurrentSession() {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.auth.getSession();
    
    if (error) {
      console.error('[Browser] Error getting session:', error);
      return { session: null, error };
    }
    
    return { session: data.session, error: null };
  } catch (error) {
    console.error('[Browser] Unexpected error getting session:', error);
    return { session: null, error };
  }
}

/**
 * Debug function to log all cookies in browser
 */
export const debugCookies = () => {
  if (typeof window === 'undefined') return;
  
  try {
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key) acc[key] = value || '';
      return acc;
    }, {} as Record<string, string>);
    
    console.log('[Browser] All cookies:', Object.keys(cookies));
    
    // Specifically check for auth cookies
    const authCookies = findBrowserAuthCookies();
    console.log(`[Browser] Auth cookies: ${authCookies.length > 0 ? authCookies.join(', ') : 'none'}`);
    
    return cookies;
  } catch (error) {
    console.error('[Browser] Error reading all cookies:', error);
    return {};
  }
};

// Backward compatibility
export const getSupabase = getSupabaseClient;
