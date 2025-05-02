import { createClient } from "@supabase/supabase-js";
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
 * Creates a custom storage interface that uses cookies instead of localStorage
 * This provides better SSR compatibility and security
 */
const createCookieStorage = () => {
  return {
    getItem: (key: string) => {
      if (typeof document === 'undefined') {
        return null;
      }
      
      try {
        // Map supabase keys to our cookie names
        let cookieKey = key;
        if (key === 'supabase.auth.token') {
          cookieKey = AUTH_TOKEN_COOKIE;
        } else if (key === 'supabase.auth.refreshToken') {
          cookieKey = REFRESH_TOKEN_COOKIE;
        } else if (key === 'supabase.auth.accessToken') {
          cookieKey = ACCESS_TOKEN_COOKIE;
        }
        
        const value = cookieUtils.get(cookieKey);
        console.log(`[Cookie Storage] Reading ${cookieKey}: ${value ? 'present' : 'not found'}`);
        return value || null;
      } catch (error) {
        console.error(`[Cookie Storage] Error getting ${key}:`, error);
        return null;
      }
    },
    setItem: (key: string, value: string) => {
      if (typeof document === 'undefined') {
        return;
      }
      
      try {
        console.log(`[Cookie Storage] Setting ${key}`);
        
        // Map Supabase keys to our cookie names
        if (key === 'supabase.auth.token') {
          const tokenData = JSON.parse(value);
          
          // Store the actual token in a separate cookie for API auth
          if (tokenData?.access_token) {
            cookieUtils.set(ACCESS_TOKEN_COOKIE, tokenData.access_token, {
              expires: 1, // 1 day (shorter expiry for security)
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax', 
              path: '/'
            });
          }
          
          // Store refresh token separately too
          if (tokenData?.refresh_token) {
            cookieUtils.set(REFRESH_TOKEN_COOKIE, tokenData.refresh_token, {
              expires: 30, // 30 days (longer expiry for refresh)
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/'
            });
          }
          
          // Store the full auth token data as well
          cookieUtils.set(AUTH_TOKEN_COOKIE, value, {
            expires: 7, // 7 days
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          });
        } else {
          // For other keys, just store directly
          cookieUtils.set(key, value, {
            expires: 7, // 7 days
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
          });
        }
      } catch (error) {
        console.error(`[Cookie Storage] Error setting ${key}:`, error);
      }
    },
    removeItem: (key: string) => {
      if (typeof document === 'undefined') {
        return;
      }
      
      try {
        console.log(`[Cookie Storage] Removing ${key}`);
        // Remove both mapped and original keys
        if (key === 'supabase.auth.token') {
          cookieUtils.remove(AUTH_TOKEN_COOKIE, { path: '/' });
          cookieUtils.remove(ACCESS_TOKEN_COOKIE, { path: '/' });
        } else if (key === 'supabase.auth.refreshToken') {
          cookieUtils.remove(REFRESH_TOKEN_COOKIE, { path: '/' });
        } else {
          cookieUtils.remove(key, { path: '/' });
        }
      } catch (error) {
        console.error(`[Cookie Storage] Error removing ${key}:`, error);
      }
    }
  };
};

/**
 * Create a Supabase client configured for browser usage
 */
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: createCookieStorage(),
      flowType: 'pkce',
      debug: process.env.NODE_ENV !== 'production'
    },
    global: {
      fetch: (...args) => {
        // Add custom headers to all Supabase requests
        // For troubleshooting authentication issues
        const [url, config] = args;
        const headers = (config?.headers || {}) as Record<string, string>;
        return fetch(url, {
          ...config,
          headers: {
            ...headers,
            'X-Client-Info': 'supabase-js-client/2.0'
          }
        });
      }
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
