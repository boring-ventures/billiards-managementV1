/**
 * Authentication utilities for consistent token handling between client and server
 */
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type NextRequest, type NextResponse } from 'next/server'
import { type RequestCookie } from 'next/dist/compiled/@edge-runtime/cookies'

// Common token names
export const AUTH_TOKEN_KEY = getSupabaseAuthCookieName()

/**
 * Get the properly formatted Supabase cookie name for the current project
 */
function getSupabaseAuthCookieName(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const projectRef = supabaseUrl?.match(/([^/]+)\.supabase\.co/)?.[1] || 'unknown'
  return `sb-${projectRef}-auth-token`
}

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
 * Create a Supabase server client with custom cookie handling for server components
 * This implementation handles Next.js 14+ async cookie API
 */
export function createServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          // For Next.js 14, cookies() returns a Promise<ReadonlyRequestCookies>
          try {
            // Using the new AsyncLocalStorage solution
            const cookieStore = cookies();
            
            // Use a different approach that's TypeScript-friendly
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
          // For Next.js 14, cookies() returns a Promise<ReadonlyRequestCookies>
          try {
            // Using the new AsyncLocalStorage solution
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
            // Using the new AsyncLocalStorage solution
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
  )
}

/**
 * Create a Supabase server client for use in middleware
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  // Debug cookie values
  console.log('[Middleware Client] Creating client with cookies:', 
    Object.fromEntries(request.cookies.getAll().map(c => [c.name, c.value.length > 20 ? c.value.substring(0, 10) + '...' : c.value])));
  
  const authCookie = request.cookies.get(AUTH_TOKEN_KEY);
  if (authCookie) {
    console.log('[Middleware Client] AUTH_TOKEN_KEY found:', AUTH_TOKEN_KEY);
    console.log('[Middleware Client] Auth cookie raw value:', 
      authCookie.value.length > 50 ? 
      authCookie.value.substring(0, 25) + '...' + authCookie.value.substring(authCookie.value.length - 25) : 
      authCookie.value);
  } else {
    console.log('[Middleware Client] AUTH_TOKEN_KEY not found in cookies');
  }
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name);
          const cookieValue = cookie?.value || null;
          const processedValue = processAuthCookieValue(cookieValue);
          
          console.log(`[Middleware Client] Getting cookie: ${name}`, { 
            exists: !!cookie,
            originalLength: cookieValue?.length,
            processedLength: processedValue?.length,
            changed: cookieValue !== processedValue
          });
          
          return processedValue;
        },
        set(name: string, value: string, options: any) {
          // Log cookie being set
          console.log(`[Middleware Client] Setting cookie: ${name}`, { 
            valueLength: value?.length,
            options
          });
          
          // We need to set cookies on the response
          response.cookies.set({
            name,
            value,
            ...options,
            sameSite: options.sameSite || 'lax',
            path: options.path || '/',
          });
        },
        remove(name: string, options: any) {
          console.log(`[Middleware Client] Removing cookie: ${name}`);
          response.cookies.set({
            name,
            value: '',
            ...options,
            path: options.path || '/',
            maxAge: 0,
          });
        }
      },
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: false,
        autoRefreshToken: true,
        persistSession: true,
      }
    }
  )
}

/**
 * Create a standard Supabase client for callback routes
 */
export function createAuthClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false
      }
    }
  )
}

/**
 * Validate auth session on the server side
 */
export async function validateSession() {
  try {
    const supabase = createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser()
    
    if (error || !data.user) {
      return { user: null, error: error?.message || 'No active session' }
    }
    
    return { user: data.user, error: null }
  } catch (error) {
    console.error('Error validating session:', error)
    return { user: null, error: 'Error validating session' }
  }
}

/**
 * Debug utility to log current cookies 
 */
export async function debugServerCookies() {
  if (typeof window !== 'undefined') return 'Cannot debug server cookies on client'
  
  try {
    // Using the new AsyncLocalStorage solution for Next.js 14
    const cookieStore = cookies();
    const store = await cookieStore;
    
    // For Next.js 14, use store as ReadonlyRequestCookies
    const authCookie = store.get(AUTH_TOKEN_KEY);
    const authCookieExists = !!authCookie;
    
    return {
      cookieCount: 'unknown', // We can't get all cookies easily in Next.js 14
      hasSbAuthCookie: authCookieExists,
      authCookieValue: authCookieExists ? 
        (authCookie?.value?.startsWith('base64-') ? 'Has base64 prefix' : 'Standard format') : 
        'missing',
      authCookieValueSample: authCookieExists && authCookie?.value ? 
        authCookie.value.substring(0, 15) + '...' : null
    }
  } catch (error) {
    return { error: 'Error reading cookies' }
  }
} 