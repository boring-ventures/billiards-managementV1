import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Process auth cookie value - handles "base64-" prefixed cookies
 * Supabase auth cookie format can change between versions
 */
function processAuthCookieValue(value: string | null): string | null {
  if (!value) return null;
  
  // Handle "base64-" prefixed cookies - strip the prefix
  if (value.startsWith('base64-')) {
    console.log('[Cookie] Removing base64 prefix from cookie value');
    return value.substring(7); // Remove 'base64-' prefix
  }
  
  return value;
}

/**
 * Creates a Supabase server client for API routes using Next.js App Router
 * This handles the correct cookie access pattern for both async and sync contexts
 */
export function createSupabaseRouteHandlerClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
            
            // Log cookie retrieval
            console.log(`[RouteHandler] Retrieved cookie ${name}:`, 
              cookieValue ? (cookieValue.length > 15 ? 
                cookieValue.substring(0, 10) + '...' : cookieValue) : 'null');
            
            // Process auth cookies to handle base64 prefix
            return processAuthCookieValue(cookieValue);
          } catch (error) {
            console.error('[Cookie] Error reading cookie:', error);
            return null;
          }
        },
        async set(name, value, options) {
          try {
            const cookieStore = cookies();
            
            console.log(`[RouteHandler] Setting cookie ${name} with options:`, options);
            
            try {
              // Await the promise and set the cookie
              const store = await cookieStore;
              store.set(name, value, {
                ...options,
                // Ensure critical attributes are set
                path: options.path || '/',
                sameSite: options.sameSite || 'lax'
              });
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieStore.set?.(name, value, {
                ...options,
                // Ensure critical attributes are set
                path: options.path || '/',
                sameSite: options.sameSite || 'lax'
              });
            }
          } catch (error) {
            console.error('[Cookie] Error setting cookie:', error);
          }
        },
        async remove(name, options) {
          try {
            const cookieStore = cookies();
            
            console.log(`[RouteHandler] Removing cookie ${name}`);
            
            try {
              // Await the promise and remove the cookie
              const store = await cookieStore;
              store.set(name, '', { 
                ...options, 
                maxAge: 0,
                path: options.path || '/' 
              });
            } catch (err) {
              // Fallback for sync context
              // @ts-ignore - Access sync API
              cookieStore.set?.(name, '', { 
                ...options, 
                maxAge: 0,
                path: options.path || '/' 
              });
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

/**
 * Helper to safely get all cookies in both async and sync contexts
 */
export async function getAllCookies() {
  const cookieStore = cookies();
  let allCookies: any[] = [];
  
  try {
    // Try async API first
    const cookieStoreResult = await cookieStore;
    allCookies = cookieStoreResult.getAll();
  } catch (err) {
    // Fallback to sync API
    // @ts-ignore - Access sync API
    allCookies = cookieStore.getAll?.() || [];
  }
  
  return allCookies;
} 