/**
 * Authentication utilities for server-side code
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type NextRequest, type NextResponse } from 'next/server'
import { AUTH_TOKEN_KEY, processAuthCookieValue } from './auth-client-utils'

/**
 * Create a Supabase server client with cookie handling for server components
 * Specifically designed for Next.js 14 where cookies() is still synchronous
 */
export function createServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // In Next.js 14, cookies() is synchronous
          try {
            // Access cookies directly, ensuring we don't treat it as a Promise
            const cookieStore = cookies();
            const cookie = cookieStore.get(name);
            
            // Debug logging
            if (name.includes('auth') || name.includes('supabase')) {
              console.log(`[Server] Reading auth cookie: ${name} = ${cookie ? 'present' : 'not found'}`);
            }
            
            return cookie?.value || null;
          } catch (error) {
            console.error('[Cookie] Error reading cookie:', error);
            return null;
          }
        },
        set() {
          // Cannot set cookies in server components
          // This will be handled by middleware
        },
        remove() {
          // Cannot remove cookies in server components
          // This will be handled by middleware
        }
      }
    }
  )
}

/**
 * Create a Supabase server client with explicit cookie access for API routes
 * This version is optimized for API routes where cookie access is different
 * @param request The NextRequest object from the API route
 */
export function createAPIRouteClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // Get cookie directly from the request
          const cookie = request.cookies.get(name);
          
          // Debug logging
          if (name.includes('auth') || name.includes('supabase')) {
            console.log(`[API] Reading auth cookie: ${name} = ${cookie ? 'present' : 'not found'}`);
          }
          
          return cookie?.value || null;
        },
        set() {
          // API routes should return cookies in the response
          // but we can't set them in this callback
        },
        remove() {
          // API routes should return cookies in the response
          // but we can't remove them in this callback
        }
      }
    }
  )
}

/**
 * Create a Supabase server client for use in middleware
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name);
          // Debug logging
          if (name.includes('auth') || name.includes('supabase')) {
            console.log(`[Middleware] Reading auth cookie: ${name} = ${cookie ? 'present' : 'not found'}`);
          }
          
          return cookie?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({
            name,
            value,
            ...options,
            sameSite: options.sameSite || 'lax',
            path: options.path || '/',
          });
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            path: options.path || '/',
            maxAge: 0,
          });
        }
      }
    }
  )
}

/**
 * Validate auth session on the server side
 * Uses getUser() for reliable authentication validation
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
    const cookieStore = cookies();
    const authCookie = cookieStore.get(AUTH_TOKEN_KEY);
    const authCookieExists = !!authCookie;
    
    return {
      hasSbAuthCookie: authCookieExists,
      authCookieValue: authCookieExists ? 
        (authCookie?.value?.substring(0, 15) + '...') : 
        'missing'
    }
  } catch (error) {
    return { error: 'Error reading cookies' }
  }
} 