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
            // The TypeScript types might suggest it's async but it's actually sync in Next.js 14
            // @ts-ignore - ignore the Promise type as it's actually synchronous in Next.js 14
            return cookies().get(name)?.value || null;
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
 * Create a Supabase client for browser use with proper cookie handling
 */
export function createBrowserSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true
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
 * Refresh the auth session on client side
 * This can be used to handle token refresh when session expires
 */
export async function refreshSession() {
  try {
    const supabase = createBrowserSupabaseClient()
    const { data, error } = await supabase.auth.refreshSession()
    
    if (error) {
      console.error('Error refreshing session:', error)
      return { success: false, error: error.message }
    }
    
    return { success: true, session: data.session }
  } catch (error) {
    console.error('Unexpected error refreshing session:', error)
    return { success: false, error: 'Failed to refresh session' }
  }
}

/**
 * Debug utility to log current cookies 
 */
export async function debugServerCookies() {
  if (typeof window !== 'undefined') return 'Cannot debug server cookies on client'
  
  try {
    // @ts-ignore - In Next.js 14, cookies() is synchronous despite the types
    const authCookie = cookies().get(AUTH_TOKEN_KEY);
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