import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Diagnostic endpoint to help identify authentication issues
 * Shows detailed information about the current auth state
 */
export async function GET(request: NextRequest) {
  // Create a standard Supabase client for API usage
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check for authorization header
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : null;
  
  // Get cookies from request
  const cookieList = request.cookies.getAll();
  const cookieNames = cookieList.map(cookie => cookie.name);
  
  // Try to extract auth tokens from cookies if they exist
  const accessTokenCookie = request.cookies.get('sb-access-token')?.value;
  const refreshTokenCookie = request.cookies.get('sb-refresh-token')?.value;
  
  // Authentication checks
  let headerAuth = null;
  let cookieAuth = null;
  let session = null;
  
  try {
    // 1. Try auth with bearer token if present
    if (bearerToken) {
      const { data, error } = await supabase.auth.getUser(bearerToken);
      headerAuth = {
        success: !error,
        userId: data?.user?.id,
        error: error ? error.message : null,
        email: data?.user?.email
      };
    }
    
    // 2. Try with access token from cookie if present
    if (accessTokenCookie) {
      const { data, error } = await supabase.auth.getUser(accessTokenCookie);
      cookieAuth = {
        success: !error,
        userId: data?.user?.id,
        error: error ? error.message : null,
        email: data?.user?.email,
        source: "access_token_cookie"
      };
    }
    
    // 3. If we have the tokens, try to get a session
    if (accessTokenCookie && refreshTokenCookie) {
      try {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessTokenCookie,
          refresh_token: refreshTokenCookie
        });
        
        session = {
          exists: !!data.session,
          expires: data.session?.expires_at 
            ? new Date(data.session.expires_at * 1000).toISOString() 
            : null,
          error: error ? error.message : null,
          refreshed: !error && !!data.session
        };
      } catch (err: any) {
        session = {
          exists: false,
          error: err.message,
          refreshed: false
        };
      }
    }
  } catch (error: any) {
    return NextResponse.json({
      error: "Auth check failed",
      message: error.message
    }, { status: 500 });
  }
  
  // Combine all information for diagnosis
  const diagnostics = {
    requestInfo: {
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent'),
      host: request.headers.get('host'),
      hasAuthHeader: !!bearerToken,
    },
    cookies: {
      names: cookieNames,
      count: cookieNames.length,
      hasAccessToken: !!accessTokenCookie,
      hasRefreshToken: !!refreshTokenCookie
    },
    authStatus: {
      headerAuth,
      cookieAuth, 
      session
    },
    environment: {
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      nodeEnv: process.env.NODE_ENV,
      isProduction: process.env.NODE_ENV === 'production'
    },
    timestamp: new Date().toISOString()
  };

  return NextResponse.json(diagnostics);
} 