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
 * Create a Supabase server client with custom cookie handling for server components
 * This implementation handles both sync and async cookies API (Next.js 14+ is async)
 */
export function createServerSupabaseClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          try {
            const cookieStore = await cookies()
            return cookieStore.get(name)?.value || null
          } catch (e) {
            // Fallback for older Next.js versions or sync contexts
            try {
              // @ts-ignore - Handle both async and sync cookies API
              const cookieStore = cookies()
              return cookieStore.get?.(name)?.value || null
            } catch (error) {
              console.error('Error getting cookie:', error)
              return null
            }
          }
        },
        async set(name: string, value: string, options: any) {
          try {
            const cookieStore = await cookies()
            cookieStore.set(name, value, options)
          } catch (e) {
            // Fallback for older Next.js versions or sync contexts
            try {
              // @ts-ignore - Handle both async and sync cookies API
              const cookieStore = cookies()
              cookieStore.set?.(name, value, options)
            } catch (error) {
              console.error('Error setting cookie:', error)
            }
          }
        },
        async remove(name: string, options: any) {
          try {
            const cookieStore = await cookies()
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch (e) {
            // Fallback for older Next.js versions or sync contexts
            try {
              // @ts-ignore - Handle both async and sync cookies API
              const cookieStore = cookies()
              cookieStore.set?.(name, '', { ...options, maxAge: 0 })
            } catch (error) {
              console.error('Error removing cookie:', error)
            }
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
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          return cookie?.value || null
        },
        set(name: string, value: string, options: any) {
          // We need to set cookies on the response
          response.cookies.set({
            name,
            value,
            ...options,
            sameSite: 'lax',
            path: '/',
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
            path: '/',
            maxAge: 0,
          })
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
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    const hasSbAuthCookie = allCookies.some((c: RequestCookie) => c.name === AUTH_TOKEN_KEY)
    
    return {
      cookieCount: allCookies.length,
      cookieNames: allCookies.map((c: RequestCookie) => c.name),
      hasSbAuthCookie,
      authCookieValue: hasSbAuthCookie ? 'present' : 'missing'
    }
  } catch (e) {
    // Fallback for older Next.js versions or sync contexts
    try {
      // @ts-ignore - Handle both async and sync cookies API
      const cookieStore = cookies()
      const allCookies = cookieStore.getAll?.() || []
      const hasSbAuthCookie = allCookies.some((c: RequestCookie) => c.name === AUTH_TOKEN_KEY)
      
      return {
        cookieCount: allCookies.length,
        cookieNames: allCookies.map((c: RequestCookie) => c.name),
        hasSbAuthCookie,
        authCookieValue: hasSbAuthCookie ? 'present' : 'missing'
      }
    } catch (error) {
      return { error: 'Error reading cookies' }
    }
  }
} 