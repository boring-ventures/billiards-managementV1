import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * Auth callback handler for Supabase authentication
 * This endpoint receives the authentication code from Supabase
 * and exchanges it for tokens, storing them in cookies
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'

  if (code) {
    try {
      // Create a Supabase client for handling the auth exchange
      const supabase = createClient(
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

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error || !data?.session) {
        console.error('Error exchanging code for session:', error?.message)
        return NextResponse.redirect(
          new URL(`/auth-error?error=${encodeURIComponent(error?.message || 'Unknown error')}`, requestUrl.origin)
        )
      }

      // Create a response with the proper redirect
      const response = NextResponse.redirect(new URL(next, requestUrl.origin))

      // Set cookies manually for the session
      const { access_token, refresh_token } = data.session
      
      response.cookies.set({
        name: 'sb-access-token',
        value: access_token,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        secure: process.env.NODE_ENV === 'production'
      })
      
      response.cookies.set({
        name: 'sb-refresh-token',
        value: refresh_token,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        secure: process.env.NODE_ENV === 'production'
      })
      
      return response
    } catch (err) {
      console.error('Unexpected error in auth callback:', err)
      return NextResponse.redirect(new URL('/sign-in', requestUrl.origin))
    }
  }

  // No code found, redirect to sign-in
  console.error('No code found in callback URL')
  return NextResponse.redirect(new URL('/sign-in', requestUrl.origin))
}
