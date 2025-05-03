import { createBrowserClient } from '@supabase/ssr'
import type { Database } from "@/types/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Get current domain for cookie settings
function getCurrentDomain() {
  if (typeof window === 'undefined') return '';
  
  // Extract domain from current URL
  const { hostname } = window.location;
  
  // For localhost, don't set domain (browser default behavior works best)
  if (hostname === 'localhost') return '';
  
  // For Vercel and other production deployments
  // Start with the hostname
  let domain = hostname;
  
  // If it's a subdomain (contains multiple dots), use root domain instead
  // e.g., app.example.com -> .example.com
  const parts = hostname.split('.');
  if (parts.length > 2 && !hostname.endsWith('.vercel.app')) {
    // Create a root domain with leading dot (.example.com)
    domain = `.${parts.slice(-2).join('.')}`;
  }
  
  console.log(`[Cookie] Using domain: ${domain || 'default'} for hostname: ${hostname}`);
  return domain;
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
            
            // If cookie value starts with base64-, strip it here
            if (cookieValue?.startsWith('base64-')) {
              console.log('[Browser] Removing base64 prefix from cookie value on read');
              return cookieValue.substring(7);
            }
            
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
          
          // Get the current domain for cookie settings
          const domain = getCurrentDomain();
          
          // Do not modify the original value - pass it directly
          // This is critical for auth tokens to work properly
          
          // IMPORTANT: Ensure we're not adding 'base64-' prefix
          // If value already has this prefix, remove it
          const cleanValue = value.startsWith('base64-') ? value.substring(7) : value;
          
          const cookieOptions = {
            path: '/',
            sameSite: 'lax',
            secure: true, // Always use secure in production
            domain: domain || undefined, // Only set if we have a domain
            maxAge: name.includes('access-token') ? 3600 : 86400 * 30, // 1 hour for access token, 30 days for refresh
            ...options
          };
          
          // Convert to cookie string
          const cookieString = Object.entries(cookieOptions)
            .filter(([_, val]) => val !== undefined) // Skip undefined values
            .map(([key, val]) => {
              if (key === 'maxAge') return `max-age=${val}`;
              if (val === true) return key;
              if (val === false) return '';
              return `${key}=${val}`;
            })
            .filter(Boolean)
            .join('; ');
          
          const fullCookie = `${name}=${cleanValue}; ${cookieString}`;
          console.log(`[Browser] Setting cookie: ${name} (${cleanValue.substring(0, 5)}...)`);
          document.cookie = fullCookie;
          
          // Verify cookie was set
          setTimeout(() => {
            const checkCookie = this.get(name);
            console.log(`[Browser] Cookie verification: ${name} = ${checkCookie ? 'set successfully' : 'FAILED TO SET'}`);
            
            if (!checkCookie) {
              console.error('[Browser] Cookie was not set successfully. Check domain and secure settings.');
              // Try again without domain as fallback
              document.cookie = `${name}=${cleanValue}; path=/; max-age=${cookieOptions.maxAge}; SameSite=Lax; Secure`;
            }
          }, 100);
        } catch (error) {
          console.error(`[Browser] Error setting cookie ${name}:`, error);
        }
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return;
        
        try {
          console.log(`[Browser] Removing cookie: ${name}`);
          
          // Get the current domain for cookie settings
          const domain = getCurrentDomain();
          
          const cookieOptions = {
            path: '/',
            domain: domain || undefined,
            ...options
          };
          
          // Convert to cookie string
          const cookieString = Object.entries(cookieOptions)
            .filter(([_, val]) => val !== undefined) // Skip undefined values
            .map(([key, val]) => {
              if (val === true) return key;
              if (val === false) return '';
              return `${key}=${val}`;
            })
            .filter(Boolean)
            .join('; ');
            
          document.cookie = `${name}=; max-age=0; ${cookieString}; Secure`;
          
          // Also try without domain just to be safe
          document.cookie = `${name}=; max-age=0; path=/; Secure`;
        } catch (error) {
          console.error(`[Browser] Error removing cookie ${name}:`, error);
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
