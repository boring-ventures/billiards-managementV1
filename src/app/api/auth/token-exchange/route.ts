import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient, getAllCookies } from '@/lib/supabase/server-utils';

type AuthResults = {
  headers: {
    authHeader: boolean;
    hasBearerToken: boolean | undefined;
    authHeaderValue: string | null;
  };
  cookies: {
    count: number;
    names: string[];
    hasSbAuthToken: boolean;
    hasSbRefreshToken: boolean;
    hasSessionCookie: boolean;
  };
  tests: {
    headerAuth: any;
    cookieAuth: any;
  };
  userData: any;
  session?: {
    success: boolean;
    hasAccessToken?: boolean;
    hasRefreshToken?: boolean;
    expiresAt?: string | null;
    error?: string | null;
  };
  environment?: {
    nodeEnv: string | undefined;
    vercelEnv: string;
    requestUrl: string;
  };
}

/**
 * Debug endpoint to test token exchange between client and server
 * This helps diagnose authentication issues by explicitly testing
 * each auth method
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseRouteHandlerClient();
    
    // Get auth headers and cookies
    const authHeader = request.headers.get('authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    
    // Get cookie information safely
    const allCookies = await getAllCookies();
    const cookieNames = allCookies.map(c => c.name);
    const cookieList = allCookies.map(c => `${c.name}: ${c.value.substring(0, 5)}...`);
    
    // Check for specific cookies
    const hasSbAuthToken = allCookies.some(c => c.name === 'sb-auth-token');
    const hasSbRefreshToken = allCookies.some(c => c.name === 'sb-refresh-token');
    const hasSessionCookie = allCookies.some(c => c.name === 'sb-auth-token-code-verifier');
    
    // Results object to track authentication tests
    const results: AuthResults = {
      headers: {
        authHeader: !!authHeader,
        hasBearerToken,
        authHeaderValue: authHeader ? `${authHeader.substring(0, 10)}...` : null
      },
      cookies: {
        count: cookieList.length,
        names: cookieNames,
        hasSbAuthToken,
        hasSbRefreshToken,
        hasSessionCookie,
      },
      tests: {
        headerAuth: null,
        cookieAuth: null
      },
      userData: null
    };
    
    // Test 1: Authenticate using the Authorization header
    if (hasBearerToken) {
      try {
        const token = authHeader!.substring(7);
        const { data, error } = await supabase.auth.getUser(token);
        
        results.tests.headerAuth = {
          success: !error,
          userId: data?.user?.id,
          error: error ? error.message : null
        };
        
        if (data?.user && !results.userData) {
          results.userData = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.user_metadata?.role || 'unknown'
          };
        }
      } catch (error: any) {
        results.tests.headerAuth = {
          success: false,
          error: error.message || String(error)
        };
      }
    }
    
    // Test 2: Authenticate using session cookies
    try {
      const { data, error } = await supabase.auth.getUser();
      
      results.tests.cookieAuth = {
        success: !error,
        userId: data?.user?.id,
        error: error ? error.message : null
      };
      
      if (data?.user && !results.userData) {
        results.userData = {
          id: data.user.id,
          email: data.user.email,
          role: data.user.user_metadata?.role || 'unknown'
        };
      }
    } catch (error: any) {
      results.tests.cookieAuth = {
        success: false,
        error: error.message || String(error)
      };
    }
    
    // Test 3: Try to get a session to check refresh tokens
    try {
      const { data, error } = await supabase.auth.getSession();
      
      results.session = {
        success: !error && !!data.session,
        hasAccessToken: !!data.session?.access_token,
        hasRefreshToken: !!data.session?.refresh_token,
        expiresAt: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
        error: error ? error.message : null
      };
    } catch (error: any) {
      results.session = {
        success: false,
        error: error.message || String(error)
      };
    }
    
    // Include environment info
    results.environment = {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'unknown',
      requestUrl: request.url
    };
    
    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({
      error: "Token exchange test failed",
      message: error.message || String(error)
    }, { status: 500 });
  }
} 