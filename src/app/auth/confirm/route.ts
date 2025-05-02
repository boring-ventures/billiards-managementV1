import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, AUTH_TOKEN_KEY } from '@/lib/auth-utils'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Auth confirmation endpoint for handling token exchange
 * This is essential for SSR environments with Supabase auth flows like:
 * - Email verification
 * - Password resets
 * - Magic links
 */
export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const token_hash = requestUrl.searchParams.get('token_hash')
    const type = requestUrl.searchParams.get('type') as EmailOtpType | null
    const next = requestUrl.searchParams.get('next') ?? '/dashboard'

    // Create a redirect URL without the auth parameters
    const redirectTo = new URL(request.url)
    redirectTo.pathname = next
    redirectTo.searchParams.delete('token_hash')
    redirectTo.searchParams.delete('type')

    // If there's no token hash or type, redirect to the error page
    if (!token_hash || !type) {
      console.error('[Auth Confirm] Missing token_hash or type')
      return NextResponse.redirect(
        new URL('/auth-error?error=Missing verification parameters', requestUrl.origin)
      )
    }

    // Verify the OTP token
    const supabase = createAuthClient()
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })

    if (error) {
      console.error('[Auth Confirm] Error verifying OTP:', error.message)
      return NextResponse.redirect(
        new URL(`/auth-error?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      )
    }

    console.log('[Auth Confirm] OTP verification successful')

    // Create a response to redirect to the next page
    const response = NextResponse.redirect(redirectTo)

    // If the verification gave us a session, save it in cookies
    if (data?.session) {
      // Set cookies manually for the session to ensure auth state is retained
      const { access_token, refresh_token, expires_at, expires_in } = data.session
      
      // Primary auth token cookie that Supabase looks for
      const authToken = {
        access_token,
        refresh_token,
        expires_at: expires_at, 
        expires_in: expires_in || 3600,
        token_type: 'bearer',
        type: 'access',
        provider: type === 'email' ? 'email' : 'magic_link'
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
      
      console.log('[Auth Confirm] Auth cookies set successfully')
    } else {
      console.log('[Auth Confirm] No session received after OTP verification')
    }

    return response
  } catch (err) {
    console.error('[Auth Confirm] Unexpected error:', err)
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
} 