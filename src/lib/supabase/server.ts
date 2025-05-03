import 'server-only';
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// Create a Supabase client for server-side usage only
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false
  }
});

/**
 * Process auth cookie value - handles "base64-" prefixed cookies
 */
function processAuthCookieValue(value: string | null): string | null {
  if (!value) return null;
  
  // Handle "base64-" prefixed cookies - strip the prefix
  if (value.startsWith('base64-')) {
    console.log('[Cookie] Removing base64 prefix from cookie value');
    return value.substring(7);
  }
  
  return value;
}

// Get a Supabase instance with cookies for authenticated requests
export function getServerSupabase() {
  // Ensure we have string values for the URL and key
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        async get(name: string) {
          try {
            const cookieStore = cookies();
            let cookieValue: string | null = null;
            
            try {
              // Await the promise
              const allCookies = await cookieStore;
              // Get the specific cookie value
              cookieValue = allCookies.get(name)?.value || null;
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieValue = cookieStore.get?.(name)?.value || null;
            }
            
            return processAuthCookieValue(cookieValue);
          } catch (error) {
            console.error('[Cookie] Error reading cookie:', error);
            return null;
          }
        },
        async set(name: string, value: string, options: any) {
          try {
            const cookieStore = cookies();
            
            try {
              // Await the promise and set the cookie
              const store = await cookieStore;
              store.set(name, value, options);
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieStore.set?.(name, value, options);
            }
          } catch (error) {
            console.error('[Cookie] Error setting cookie:', error);
          }
        },
        async remove(name: string, options: any) {
          try {
            const cookieStore = cookies();
            
            try {
              // Await the promise and remove the cookie
              const store = await cookieStore;
              store.set(name, '', { ...options, maxAge: 0 });
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieStore.set?.(name, '', { ...options, maxAge: 0 });
            }
          } catch (error) {
            console.error('[Cookie] Error removing cookie:', error);
          }
        }
      },
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        autoRefreshToken: true,
        persistSession: true,
      }
    }
  );
} 