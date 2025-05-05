/**
 * Authentication utilities for client-side code
 */
import { getSupabaseClient } from '@/lib/supabase/client';

// Common token names
export const AUTH_TOKEN_KEY = getSupabaseAuthCookieName()

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
 * @deprecated Use getSupabaseClient() from @/lib/supabase/client.ts instead
 */
export function createBrowserSupabaseClient() {
  // This is now just a wrapper around the canonical client source
  return getSupabaseClient();
}

/**
 * Create a standard Supabase client for callback routes
 * @deprecated Use getSupabaseClient() from @/lib/supabase/client.ts instead
 */
export function createAuthClient() {
  // Use the canonical client but configure it differently
  return getSupabaseClient();
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
    
    const supabase = getSupabaseClient()
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