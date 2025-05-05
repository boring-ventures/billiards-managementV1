/**
 * Authentication utilities for client-side code
 */
import { getSupabaseClient } from '@/lib/supabase/client';
import { supabase } from './supabase/client';
import { getSupabaseCookiePattern } from './supabase/client';

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
 * Store session data in localStorage to help Supabase client access it
 * This is a helper function to ensure the session is available in localStorage
 * as Supabase sometimes has issues with cookie-only storage
 */
export function storeSessionData(sessionData: any) {
  if (typeof window === 'undefined') return;
  
  try {
    // Store the session in localStorage in the format Supabase expects
    const storageKey = 'supabase.auth.token';
    if (sessionData && sessionData.access_token) {
      // Create the session object in the format Supabase expects
      const sessionObj = {
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at,
        expires_in: sessionData.expires_in,
        token_type: 'bearer',
        provider: 'email',
        user: sessionData.user
      };
      
      // Store it in localStorage
      localStorage.setItem(storageKey, JSON.stringify(sessionObj));
      console.log('Session data stored in localStorage for Supabase');
      
      // Also manually set a flag to indicate we have a session
      localStorage.setItem('has_session', 'true');
    }
  } catch (error) {
    console.error('Error storing session data in localStorage:', error);
  }
}

/**
 * Check if we have any form of session available
 */
export function hasSessionAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check cookies
    const cookiePattern = getSupabaseCookiePattern();
    const hasCookie = document.cookie.split(';').some(cookie => 
      cookie.trim().startsWith(cookiePattern)
    );
    
    // Check localStorage
    const hasLocalStorage = !!localStorage.getItem('supabase.auth.token');
    const hasSessionFlag = localStorage.getItem('has_session') === 'true';
    
    // Log details for debugging
    console.log(`Session availability check: cookie=${hasCookie}, localStorage=${hasLocalStorage}, flag=${hasSessionFlag}`);
    
    return hasCookie || hasLocalStorage || hasSessionFlag;
  } catch (error) {
    console.error('Error checking session availability:', error);
    return false;
  }
}

/**
 * Refresh the auth session
 */
export async function refreshSession() {
  try {
    const client = supabase();
    if (!client || !client.auth) {
      console.error('Invalid Supabase client');
      return false;
    }
    
    // If we have a session in localStorage, refresh it
    if (hasSessionAvailable()) {
      const { data, error } = await client.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing session:', error);
        return false;
      }
      
      if (data && data.session) {
        // Store the refreshed session data
        storeSessionData(data.session);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error in refreshSession:', error);
    return false;
  }
} 