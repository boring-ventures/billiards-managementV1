/**
 * Authentication utilities for client-side code
 */
import { createClient } from '@supabase/supabase-js'

// Common token names
export const AUTH_TOKEN_KEY = getSupabaseAuthCookieName()

// Singleton instance for browser
let browserClientInstance: ReturnType<typeof createClient> | null = null;

/**
 * Get the properly formatted Supabase cookie name for the current project
 */
function getSupabaseAuthCookieName(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = supabaseUrl?.match(/([^/]+)\.supabase\.co/)?.[1] || 'unknown'
  return `sb-${projectRef}-auth-token`
}

/**
 * Process auth cookie value - handles "base64-" prefixed cookies
 * Supabase auth cookie format can change between versions
 */
export function processAuthCookieValue(value: string | null): string | null {
  if (!value) return null;
  
  // Handle "base64-" prefixed cookies - strip the prefix
  if (value.startsWith('base64-')) {
    console.log('[Cookie] Removing base64 prefix from cookie value');
    return value.substring(7); // Remove 'base64-' prefix
  }
  
  return value;
}

/**
 * Create a Supabase client for browser use with proper cookie handling
 * Implements singleton pattern to ensure only one instance exists
 * 
 * During SSR, returns a minimal client that won't throw errors
 */
export function createBrowserSupabaseClient() {
  // If we already have an instance, return it
  if (browserClientInstance) {
    return browserClientInstance;
  }

  // Check if we're in a browser context
  const isBrowser = typeof window !== 'undefined';
  
  if (isBrowser) {
    // We're in the browser, create a real client
    console.log('[Auth] Creating singleton Supabase browser client instance');
    browserClientInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce',
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      }
    );
    
    return browserClientInstance;
  } else {
    // We're in SSR/SSG, create a minimal client that won't cause issues
    // This client will be replaced with a real one when hydration occurs on the client
    console.log('[Auth] Creating minimal SSR-compatible Supabase client');
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          flowType: 'pkce',
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
}

/**
 * Create a standard Supabase client for callback routes
 */
export function createAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    }
  )
}

/**
 * Refresh the auth session on client side
 * This can be used to handle token refresh when session expires
 */
export async function refreshSession() {
  try {
    // Don't attempt to refresh in SSR context
    if (typeof window === 'undefined') {
      return { success: false, error: 'Cannot refresh session during server-side rendering' };
    }
    
    const supabase = createBrowserSupabaseClient()
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('Error refreshing session:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, session: data.session }
  } catch (error) {
    console.error('Unexpected error refreshing session:', error)
    return { success: false, error: 'Failed to refresh session' }
  }
} 