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
        secure: true, // Always set secure in production and development
        httpOnly: true,
        domain: getDomainForCookie(request)
      })
      
      console.log('[Auth Callback] Auth cookies set with value length:', authCookieValue.length);
      console.log('[Auth Callback] Auth cookie domain:', getDomainForCookie(request));
      console.log('[Auth Callback] Auth cookie name:', AUTH_TOKEN_KEY);
      
      // Use session.getSession() on the next request to pick up this cookie
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

/**
 * Helper function to get the appropriate domain for cookies
 * For localhost, this should be undefined (browser default)
 * For production, this should be the root domain
 */
function getDomainForCookie(request: NextRequest): string | undefined {
  const host = request.headers.get('host') || '';
  
  // Don't set domain for localhost (let browser default to host)
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return undefined;
  }
  
  // For Vercel previews, don't set domain (use the complete subdomain as is)
  if (host.includes('vercel.app')) {
    return undefined;
  }
  
  // Extract domain parts
  const hostParts = host.split('.');
  
  // If we have at least domain.tld format
  if (hostParts.length >= 2) {
    // For production, use the root domain (e.g., example.com)
    const rootDomain = hostParts.slice(-2).join('.');
    console.log(`[Auth Callback] Setting cookie domain to root domain: ${rootDomain}`);
    return rootDomain;
  }
  
  // Default to undefined (browser will use the host header)
  return undefined;
}
