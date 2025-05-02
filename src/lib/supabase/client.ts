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
        
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          if (key) acc[key] = value || '';
          return acc;
        }, {} as Record<string, string>);
        
        console.log(`[Cookie Storage] Reading ${name}: ${cookies[name] ? 'present' : 'not found'}`);
        return cookies[name] || null;
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return;
        
        try {
          console.log(`[Cookie Storage] Setting ${name}`);
          
          const cookieOptions = Object.entries({
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: name.includes('access-token') ? 3600 : 86400 * 30, // 1 hour for access token, 30 days for refresh
            ...options
          })
            .map(([key, val]) => {
              if (key === 'maxAge') return `max-age=${val}`;
              if (val === true) return key;
              if (val === false) return '';
              return `${key}=${val}`;
            })
            .filter(Boolean)
            .join('; ');
          
          document.cookie = `${name}=${value}; ${cookieOptions}`;
        } catch (error) {
          console.error(`[Cookie Storage] Error setting ${name}:`, error);
        }
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return;
        
        try {
          console.log(`[Cookie Storage] Removing ${name}`);
          const cookieOptions = Object.entries({
            path: '/',
            ...options
          })
            .map(([key, val]) => {
              if (val === true) return key;
              if (val === false) return '';
              return `${key}=${val}`;
            })
            .filter(Boolean)
            .join('; ');
            
          document.cookie = `${name}=; max-age=0; ${cookieOptions}`;
        } catch (error) {
          console.error(`[Cookie Storage] Error removing ${name}:`, error);
        }
      }
    },
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
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
