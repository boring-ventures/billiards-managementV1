import { createBrowserClient } from '@supabase/ssr'
import type { Database } from "@/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Global instance that is shared between calls in the same browser session
let globalInstance: any = null;

/**
 * Create a Supabase client configured for browser usage with the SSR package
 */
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
);

/**
 * Get a singleton instance of Supabase client to ensure consistent auth state
 */
export const getSupabase = () => {
  if (globalInstance) {
    return globalInstance;
  }
  
  console.log('[Browser] Creating new Supabase client instance');
  globalInstance = supabase;
  return globalInstance;
};

/**
 * Debug function to log all cookies in browser
 */
export const debugCookies = () => {
  if (typeof document === 'undefined') return;
  
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
