import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, AUTH_TOKEN_KEY } from '@/lib/auth-utils'

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
      console.log('[Auth Callback] Processing auth code')
      
      // Create a Supabase client for handling the auth exchange
      const supabase = createAuthClient()

      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error || !data?.session) {
        console.error('Error exchanging code for session:', error?.message)
        return NextResponse.redirect(
          new URL(`/auth-error?error=${encodeURIComponent(error?.message || 'Unknown error')}`, requestUrl.origin)
        )
      }

      console.log('[Auth Callback] Successfully exchanged code for session')
      
      // Create a response with the proper redirect
      const response = NextResponse.redirect(new URL(next, requestUrl.origin))

      // Set cookies manually for the session
      const { access_token, refresh_token, expires_at, expires_in } = data.session
      
      // Extract project reference from the Supabase URL for cookie naming
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/([^/]+)\.supabase\.co/)?.[1] || 'unknown'
      console.log(`[Auth Callback] Using auth token key: ${AUTH_TOKEN_KEY}`)
      
      // Primary auth token cookie that Supabase looks for - must be carefully formatted
      const authToken = {
        access_token,
        refresh_token,
        expires_at: expires_at, // Use the expires_at from the session
        expires_in: expires_in || 3600, // Default to 1 hour if not provided
        token_type: 'bearer',
        type: 'access',
        provider: 'email'
      }

      // Sanitize the user object to include only necessary fields for the cookie
      const sanitizedUser = {
        id: data.session.user.id,
        email: data.session.user.email,
        role: data.session.user.role,
        app_metadata: data.session.user.app_metadata,
        user_metadata: data.session.user.user_metadata,
        aud: data.session.user.aud
      }
      
      const authCookieValue = JSON.stringify({
        ...authToken,
        user: sanitizedUser
      })
      
      // Set the main auth cookie that Supabase uses for session management
      response.cookies.set({
        name: AUTH_TOKEN_KEY,
        value: authCookieValue,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
      })
      
      // Also set individual cookies for access and refresh tokens
      // These can be helpful for client-side token management
      response.cookies.set({
        name: `sb-access-token`,
        value: access_token,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60, // 1 hour
        secure: process.env.NODE_ENV === 'production'
      })
      
      response.cookies.set({
        name: `sb-refresh-token`,
        value: refresh_token,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        secure: process.env.NODE_ENV === 'production'
      })
      
      console.log('[Auth Callback] Auth cookies set successfully')
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
