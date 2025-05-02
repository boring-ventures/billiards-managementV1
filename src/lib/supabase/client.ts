import { createClient } from "@supabase/supabase-js";
import Cookies from 'js-cookie';
import { cookieUtils, AUTH_TOKEN_COOKIE } from '@/lib/cookie-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

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
      return cookieUtils.get(key) || null;
    },
    setItem: (key: string, value: string) => {
      if (typeof document === 'undefined') return;
      cookieUtils.set(key, value, { 
        expires: 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    },
    removeItem: (key: string) => {
      if (typeof document === 'undefined') return;
      cookieUtils.remove(key);
    }
  };
};

/**
 * Creates and returns a singleton Supabase client instance
 * This ensures we only have one Supabase client per browser session
 * Uses cookies instead of localStorage for better SSR compatibility
 */
export function createSupabaseClient() {
  // In a browser environment, return the singleton instance if it exists
  if (typeof window !== 'undefined' && globalInstance) {
    return globalInstance;
  }
  
  // For SSR, create a non-persistent client
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
  
  // Create a cookie-based storage system
  const cookieStorage = createCookieStorage();
  
  // Create a new client instance for browser
  const newInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: AUTH_TOKEN_COOKIE,
      storage: cookieStorage,
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
  });
  
  // Store the instance globally
  globalInstance = newInstance;
  
  return newInstance;
}

// Only create the singleton client instance once
export const supabase = createSupabaseClient();
