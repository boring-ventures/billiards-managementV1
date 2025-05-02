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
  supabaseAnonKey,
  {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return null;
        
        try {
          // Get directly from document.cookie
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          
          if (parts.length === 2) {
            const cookieValue = parts.pop()?.split(';').shift() || null;
            console.log(`[Browser] Cookie read: ${name} = ${cookieValue ? 'present' : 'not found'}`);
            return cookieValue;
          }
          
          console.log(`[Browser] Cookie not found: ${name}`);
          return null;
        } catch (error) {
          console.error(`[Browser] Error reading cookie ${name}:`, error);
          return null;
        }
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return;
        
        try {
          console.log(`[Browser] Setting cookie: ${name}`);
          
          const cookieOptions = {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: name.includes('access-token') ? 3600 : 86400 * 30, // 1 hour for access token, 30 days for refresh
            ...options
          };
          
          // Convert to cookie string
          const cookieString = Object.entries(cookieOptions)
            .map(([key, val]) => {
              if (key === 'maxAge') return `max-age=${val}`;
              if (val === true) return key;
              if (val === false) return '';
              return `${key}=${val}`;
            })
            .filter(Boolean)
            .join('; ');
          
          document.cookie = `${name}=${value}; ${cookieString}`;
          
          // Verify cookie was set
          setTimeout(() => {
            const checkCookie = this.get(name);
            console.log(`[Browser] Cookie verification: ${name} = ${checkCookie ? 'set successfully' : 'FAILED TO SET'}`);
          }, 100);
        } catch (error) {
          console.error(`[Browser] Error setting cookie ${name}:`, error);
        }
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return;
        
        try {
          console.log(`[Browser] Removing cookie: ${name}`);
          
          const cookieOptions = {
            path: '/',
            ...options
          };
          
          // Convert to cookie string
          const cookieString = Object.entries(cookieOptions)
            .map(([key, val]) => {
              if (val === true) return key;
              if (val === false) return '';
              return `${key}=${val}`;
            })
            .filter(Boolean)
            .join('; ');
            
          document.cookie = `${name}=; max-age=0; ${cookieString}`;
          
          // Verify cookie was removed
          setTimeout(() => {
            const checkCookie = this.get(name);
            console.log(`[Browser] Cookie removal verification: ${name} = ${!checkCookie ? 'removed successfully' : 'FAILED TO REMOVE'}`);
          }, 100);
        } catch (error) {
          console.error(`[Browser] Error removing cookie ${name}:`, error);
        }
      }
    },
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      debug: true // Enable auth debugging
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
