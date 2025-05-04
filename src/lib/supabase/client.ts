import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from "@/types/database.types";

// Environment variables for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * CANONICAL SUPABASE CLIENT
 * 
 * This is the ONLY place in the entire application where Supabase client instances
 * should be created. All other files should import from here.
 */

// Singleton instance for browser - using @supabase/ssr
let browserClientInstance: ReturnType<typeof createBrowserClient> | null = null;

// Singleton instance for direct supabase-js usage (if needed)
let jsClientInstance: ReturnType<typeof createClient> | null = null;

/**
 * Get a singleton instance of Supabase client using the SSR package
 * This is the preferred way to access the Supabase client in any context
 * 
 * In SSR context, this returns a placeholder client that will be replaced during hydration
 */
export const getSupabaseClient = () => {
  // On the browser, use/create the singleton instance
  if (typeof window !== 'undefined') {
    if (browserClientInstance) {
      return browserClientInstance;
    }
    
    console.log('[Browser] Creating new Supabase client instance');
    browserClientInstance = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    );
    
    return browserClientInstance;
  }
  
  // In SSR context, return a new instance each time
  // This won't persist sessions but works for SSR without errors
  console.log('[SSR] Creating placeholder Supabase client');
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
};

/**
 * Get a singleton instance of the direct Supabase JS client
 * Only use this if you specifically need features from the direct JS client
 */
export const getSupabaseJS = () => {
  // On the browser, use/create the singleton instance
  if (typeof window !== 'undefined') {
    if (jsClientInstance) {
      return jsClientInstance;
    }
    
    console.log('[Browser] Creating new Supabase JS client instance');
    jsClientInstance = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          flowType: 'pkce',
          autoRefreshToken: true,
          detectSessionInUrl: true,
          persistSession: true
        }
      }
    );
    
    return jsClientInstance;
  }
  
  // In SSR context, return a minimal client
  console.log('[SSR] Creating placeholder Supabase JS client');
  return createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Backwards compatibility with existing code
export const getSupabase = getSupabaseClient;
export const supabase = () => getSupabaseClient();

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
    return cookies;
  } catch (error) {
    console.error('[Browser] Error reading all cookies:', error);
    return {};
  }
};
