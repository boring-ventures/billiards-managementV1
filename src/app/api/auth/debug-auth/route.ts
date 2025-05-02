import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, AUTH_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/cookie-utils";

/**
 * Debug endpoint to check authentication status with detailed information
 * This helps diagnose authentication issues in different environments
 */
export async function GET(request: NextRequest) {
  try {
    // Get detailed information about cookies
    const cookieStore = cookies();
    const cookiesList = request.cookies.getAll();
    const cookieNames = cookiesList.map(c => c.name);
    
    // Check for auth tokens in both header and cookies
    const authHeader = request.headers.get('authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    
    // Check for specific auth cookies
    const allStoreCookies = cookieStore.getAll();
    const hasSbAuthToken = allStoreCookies.some(c => c.name === AUTH_TOKEN_COOKIE);
    const hasSbAccessToken = allStoreCookies.some(c => c.name === ACCESS_TOKEN_COOKIE);
    const hasSbRefreshToken = allStoreCookies.some(c => c.name === REFRESH_TOKEN_COOKIE);
    const hasDefaultAccessToken = allStoreCookies.some(c => c.name === 'sb-access-token');
    const hasDefaultRefreshToken = allStoreCookies.some(c => c.name === 'sb-refresh-token');
    
    // Record what auth tokens we find
    const authDetails = {
      header: {
        present: !!authHeader,
        isBearerToken: hasBearerToken,
        value: hasBearerToken ? `${authHeader!.substring(7, 15)}...` : null
      },
      cookies: {
        all: cookieNames,
        authTokenPresent: hasSbAuthToken,
        accessTokenPresent: hasSbAccessToken,
        refreshTokenPresent: hasSbRefreshToken,
        sbAccessTokenPresent: hasDefaultAccessToken,
        sbRefreshTokenPresent: hasDefaultRefreshToken,
      },
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      nodeEnv: process.env.NODE_ENV,
      requestMethod: request.method,
      requestPath: request.nextUrl.pathname,
      origin: request.headers.get('origin') || 'unknown',
      host: request.headers.get('host') || 'unknown',
      referer: request.headers.get('referer') || 'unknown',
    };
    
    // Try to authenticate and log the response
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    let authTokenResult = null;
    let cookieAuthResult = null;
    let sessionResult = null;
    
    // 1. Test auth with bearer token if available
    if (hasBearerToken) {
      try {
        const token = authHeader!.substring(7);
        console.log('[Debug Auth] Testing Bearer token auth');
        const { data, error } = await supabase.auth.getUser(token);
        
        authTokenResult = {
          success: !error,
          userId: data?.user?.id,
          error: error ? error.message : null,
          userEmail: data?.user?.email
        };
      } catch (error: any) {
        authTokenResult = {
          success: false,
          error: error.message || String(error)
        };
      }
    }
    
    // 2. Test auth with cookie
    try {
      console.log('[Debug Auth] Testing cookie auth');
      const { data, error } = await supabase.auth.getUser();
      
      cookieAuthResult = {
        success: !error,
        userId: data?.user?.id,
        error: error ? error.message : null,
        userEmail: data?.user?.email
      };
    } catch (error: any) {
      cookieAuthResult = {
        success: false,
        error: error.message || String(error)
      };
    }
    
    // 3. Test session
    try {
      console.log('[Debug Auth] Testing session');
      const { data, error } = await supabase.auth.getSession();
      
      sessionResult = {
        success: !error && !!data.session,
        hasAccessToken: !!data.session?.access_token,
        hasRefreshToken: !!data.session?.refresh_token,
        expiresAt: data.session?.expires_at 
          ? new Date(data.session.expires_at * 1000).toISOString() 
          : null,
        error: error ? error.message : null
      };
    } catch (error: any) {
      sessionResult = {
        success: false,
        error: error.message || String(error)
      };
    }
    
    // Combine and return all the diagnostics
    const diagnostics = {
      authDetails,
      authResults: {
        bearerToken: authTokenResult,
        cookie: cookieAuthResult,
        session: sessionResult
      },
      timestamp: new Date().toISOString()
    };
    
    // Add auth state to response headers for debug purposes
    const headers = new Headers();
    headers.set('X-Auth-Header-Valid', String(!!authTokenResult?.success));
    headers.set('X-Auth-Cookie-Valid', String(!!cookieAuthResult?.success));
    
    return NextResponse.json(diagnostics, { headers });
  } catch (error: any) {
    console.error('[Debug Auth] Unexpected error:', error);
    return NextResponse.json({
      error: "Auth debug failed",
      message: error.message || String(error),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 