import { createClient } from "@supabase/supabase-js";
import Cookies from 'js-cookie';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Storage key constants
const STORAGE_KEY = 'sb-auth-token';

// Global instance that is shared between calls in the same browser session
let globalInstance: ReturnType<typeof createClient> | null = null;

/**
 * Creates a custom storage interface that uses cookies instead of localStorage
 * This provides better SSR compatibility and security
 */
const createCookieStorage = () => {
  return {
    getItem: (key: string) => {
      if (typeof document === 'undefined') return null;
      const value = Cookies.get(key);
      return value || null;
    },
    setItem: (key: string, value: string) => {
      if (typeof document === 'undefined') return;
      // Store in cookie with Secure and SameSite flags for better security
      Cookies.set(key, value, { 
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax'
      });
    },
    removeItem: (key: string) => {
      if (typeof document === 'undefined') return;
      Cookies.remove(key);
    }
  };
};

/**
 * Creates and returns a singleton Supabase client instance
 * This ensures we only have one Supabase client per browser session
 * Uses cookies instead of localStorage for better SSR compatibility
 */
export function createSupabaseClient() {
  // For SSR, always create a fresh client
  if (typeof window === 'undefined') {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        flowType: 'pkce',
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }
  
  // In browser, use global singleton
  if (globalInstance) return globalInstance;
  
  // Create a cookie-based storage system
  const cookieStorage = createCookieStorage();
  
  globalInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: STORAGE_KEY,
      storage: cookieStorage,
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
  });
  
  return globalInstance;
}

// Export a singleton instance for direct imports
export const supabase = createSupabaseClient();
