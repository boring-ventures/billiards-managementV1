import { createBrowserClient } from '@supabase/ssr'
import type { Database } from "@/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Global instance that is shared between calls in the same browser session
let globalInstance: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Get a singleton instance of Supabase client to ensure consistent auth state
 * This is the preferred way to access the Supabase client in browser context
 */
export const getSupabase = () => {
  if (typeof window === 'undefined') {
    throw new Error("getSupabase should only be called in browser context");
  }

  if (globalInstance) {
    return globalInstance;
  }
  
  console.log('[Browser] Creating new Supabase client instance');
  globalInstance = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  );
  
  return globalInstance;
};

// Export a function that always returns the singleton instance
// This replaces the direct client export
export const supabase = () => getSupabase();

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
