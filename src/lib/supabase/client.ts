import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import Cookies from 'js-cookie';
import { cookieUtils, AUTH_TOKEN_COOKIE } from '@/lib/cookie-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Global instance that is shared between calls in the same browser session
let globalInstance: any = null;

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
      
      // Important: Determine if we're in production for cookie settings
      const isProduction = process.env.NODE_ENV === 'production';
      
      // Get domain settings for proper cookie storage in production
      let domain;
      if (isProduction && typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (!hostname.match(/^(localhost|(\d{1,3}\.){3}\d{1,3})$/)) {
          domain = hostname.includes('.') ? hostname : undefined;
        }
      }
      
      cookieUtils.set(key, value, { 
        expires: 7, // 7 days
        secure: isProduction,
        sameSite: 'lax',
        path: '/', // Ensure cookies are available for entire domain
        domain, // Use determined domain in production
      });
    },
    removeItem: (key: string) => {
      if (typeof document === 'undefined') return;
      
      // Use same domain settings for removal
      let domain;
      if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        if (!hostname.match(/^(localhost|(\d{1,3}\.){3}\d{1,3})$/)) {
          domain = hostname.includes('.') ? hostname : undefined;
        }
      }
      
      cookieUtils.remove(key, { path: '/', domain });
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
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
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
  
  // Create a new client instance for browser with additional debug info
  const newInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      storageKey: AUTH_TOKEN_COOKIE,
      storage: cookieStorage,
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      // Note: Cookie settings are managed by the cookieStorage implementation above
    },
    global: {
      headers: {
        'X-Client-Info': 'supabase-js/2.0.0',
      },
    },
  });
  
  // Add debug information to console if not in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('Supabase client initialized with cookie storage');
  }
  
  // Store the instance globally
  globalInstance = newInstance;
  
  return newInstance;
}

// Get the singleton instance
export const supabase = createSupabaseClient();
