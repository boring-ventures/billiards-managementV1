import { createBrowserClient } from '@supabase/ssr'
import type { Database } from "@/types/database.types";
import { cookieUtils, AUTH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, ACCESS_TOKEN_COOKIE } from '@/lib/cookie-utils';

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
  supabaseAnonKey,
  {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return null;
        
        try {
          const value = cookieUtils.get(name);
          console.log(`[Cookie Storage] Reading ${name}: ${value ? 'present' : 'not found'}`);
          return value || null;
        } catch (error) {
          console.error(`[Cookie Storage] Error getting ${name}:`, error);
          return null;
        }
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return;
        
        try {
          console.log(`[Cookie Storage] Setting ${name}`);
          
          // For auth tokens, set with specific options
          if (name.includes('access-token')) {
            cookieUtils.set(ACCESS_TOKEN_COOKIE, value, {
              ...options,
              expires: 1, // 1 day (shorter expiry for security)
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            });
          } else if (name.includes('refresh-token')) {
            cookieUtils.set(REFRESH_TOKEN_COOKIE, value, {
              ...options,
              expires: 30, // 30 days
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            });
          } else {
            // For other cookies, use default options
            cookieUtils.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            });
          }
        } catch (error) {
          console.error(`[Cookie Storage] Error setting ${name}:`, error);
        }
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return;
        
        try {
          console.log(`[Cookie Storage] Removing ${name}`);
          cookieUtils.remove(name, { path: '/' });
        } catch (error) {
          console.error(`[Cookie Storage] Error removing ${name}:`, error);
        }
      }
    },
    auth: {
      flowType: 'pkce',
      debug: process.env.NODE_ENV !== 'production'
    }
  }
);

/**
 * Get a singleton instance of Supabase client to ensure consistent auth state
 */
export const getSupabase = () => {
  if (globalInstance) {
    return globalInstance;
  }
  
  console.log('Creating new Supabase client instance');
  globalInstance = supabase;
  return globalInstance;
};
