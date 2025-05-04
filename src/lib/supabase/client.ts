import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Database } from "@/types/database.types";

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

// Create instance immediately on module load for client environments
if (typeof window !== 'undefined') {
  try {
    console.log('[Browser] Creating Supabase client instance during module initialization');
    browserClientInstance = createBrowserClient<Database>(
      supabaseUrl,
      supabaseAnonKey
    );
  } catch (error) {
    console.error('[Browser] Error creating Supabase client during initialization:', error);
  }
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
    if (browserClientInstance) {
      return browserClientInstance;
    }
    
    console.log('[Browser] Creating new Supabase client instance');
    
    try {
      browserClientInstance = createBrowserClient<Database>(
        supabaseUrl,
        supabaseAnonKey
      );
      
      return browserClientInstance;
    } catch (error) {
      console.error('[Browser] Error creating Supabase client:', error);
      throw new Error('Failed to create Supabase client: ' + (error instanceof Error ? error.message : String(error)));
    }
  }
  
  // In SSR context, return a new instance each time
  // This won't persist sessions but works for SSR without errors
  console.log('[SSR] Creating placeholder Supabase client');
  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
};

// Backwards compatibility with existing code
export const getSupabase = getSupabaseClient;

// Create eager instance to prevent undefined errors
export const supabase = typeof window !== 'undefined' 
  ? () => browserClientInstance || getSupabaseClient() 
  : getSupabaseClient;

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
