import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Auth confirmation endpoint for handling token exchange
 * This is essential for SSR environments with Supabase
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
    redirectTo.searchParams.delete('next')

    console.log(`[Auth Confirm] Processing token verification: type=${type}`)

    if (token_hash && type) {
      // Create a response object that we'll send back
      const response = NextResponse.redirect(redirectTo)
      
      // Create a Supabase client with minimal config for OTP verification
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

      // Verify the OTP token
      const { data, error } = await supabase.auth.verifyOtp({ 
        type, 
        token_hash 
      })

      if (error) {
        console.error(`[Auth Confirm] Error verifying token: ${error.message}`)
        return NextResponse.redirect(
          new URL(`/auth-error?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
        )
      }

      // On successful verification, set cookies for the session
      if (data.session) {
        const { access_token, refresh_token, expires_at, expires_in } = data.session
        
        // Extract project reference from the Supabase URL for cookie naming
        const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL?.match(/([^/]+)\.supabase\.co/)?.[1] || 'unknown'
        console.log(`[Auth Confirm] Setting cookies for project: ${projectRef}`)
        
        // Primary auth token cookie that Supabase looks for
        const authToken = {
          access_token,
          refresh_token,
          expires_at: expires_at,
          expires_in: expires_in || 3600,
          token_type: 'bearer',
          type: 'access',
          provider: 'email'
        }

        // Sanitize the user object to include only necessary fields
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
        
        // Set the main auth cookie for session management
        response.cookies.set({
          name: `sb-${projectRef}-auth-token`,
          value: authCookieValue,
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true
        })
      }

      console.log('[Auth Confirm] Token verified successfully, redirecting to:', next)
      return response
    }

    console.error('[Auth Confirm] Missing token_hash or type parameters')
    return NextResponse.redirect(new URL('/sign-in', requestUrl.origin))
  } catch (error) {
    console.error('[Auth Confirm] Unexpected error:', error)
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
} 