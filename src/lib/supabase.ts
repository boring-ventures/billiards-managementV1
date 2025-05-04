// src/lib/supabase.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseClient } from './supabase/client'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Browser client (client-side) - uses the singleton pattern
export const createClient = () => {
  // Use our canonical singleton implementation
  return getSupabaseClient()
}

// Server client (server components, API routes)
export const createServerComponentClient = () => {
  // Creating a synchronous cookieStore from the async cookies() API
  // to fix the Promise<ReadonlyRequestCookies> type issue
  const cookiesStore = cookies();
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        const cookieValue = cookiesStore.get(name);
        return cookieValue?.value;
      },
      set(name, value, options) {
        try {
          cookiesStore.set(name, value, options);
        } catch (error) {
          // This will fail in Server Components, which is expected
          // The middleware will handle refreshing the session
        }
      },
      remove(name, options) {
        try {
          cookiesStore.set(name, '', { ...options, maxAge: 0 });
        } catch (error) {
          // This will fail in Server Components, which is expected
          // The middleware will handle refreshing the session
        }
      },
    },
  })
}

// Middleware client (middleware.ts)
export const createMiddlewareClient = (request: NextRequest, response: NextResponse) => {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value
      },
      set(name, value, options) {
        response.cookies.set({
          name,
          value,
          ...options,
          sameSite: options?.sameSite || 'lax',
          path: options?.path || '/',
        })
      },
      remove(name, options) {
        response.cookies.set({
          name,
          value: '',
          ...options,
          maxAge: 0,
          path: options?.path || '/',
        })
      },
    },
  })
} 