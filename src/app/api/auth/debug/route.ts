import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Diagnostic endpoint to help debug authentication issues
 * This will return details about cookies, headers, and auth state
 */
export async function GET(request: NextRequest) {
  try {
    // Examine cookies from the request
    const cookieList = request.cookies.getAll();
    const cookieNames = cookieList.map(c => c.name);
    
    // Check for important auth-related cookies
    const hasAuthCookie = cookieNames.some(name => name.includes('auth'));
    const hasRefreshToken = cookieNames.some(name => name.includes('refresh'));
    const hasAccessToken = cookieNames.some(name => name.includes('access'));
    
    // Get the auth header
    const authHeader = request.headers.get('authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ') || false;
    
    // Get environment info
    const requestDomain = request.headers.get('host') || 'unknown';
    
    // Create a response object with debug info
    const debugInfo = {
      cookies: {
        count: cookieList.length,
        names: cookieNames,
        hasAuthCookie,
        hasRefreshToken,
        hasAccessToken
      },
      headers: {
        hasBearerToken,
        host: requestDomain,
        userAgent: request.headers.get('user-agent') || 'unknown',
        referer: request.headers.get('referer') || 'none'
      },
      request: {
        url: request.url,
        method: request.method
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        isProduction: process.env.NODE_ENV === 'production'
      }
    };
    
    // Try to get cookies manually
    const manualCookieCheck = Object.fromEntries(
      cookieList.map(cookie => [cookie.name, cookie.value.substring(0, 10) + '...'])
    );
    
    // Try to get the user session if possible
    try {
      // Create a Supabase client for the API route
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              const cookie = cookies().get(name);
              return cookie?.value || null;
            },
            set() {}, // Not used in read-only API context
            remove() {} // Not used in read-only API context
          }
        }
      );
      
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        return NextResponse.json({
          ...debugInfo,
          auth: {
            status: 'error',
            message: error.message,
            cookies: manualCookieCheck
          }
        });
      }
      
      if (!data?.user) {
        return NextResponse.json({
          ...debugInfo,
          auth: {
            status: 'unauthenticated',
            message: 'No user session found',
            cookies: manualCookieCheck
          }
        });
      }
      
      // User is authenticated, return minimal user data
      return NextResponse.json({
        ...debugInfo,
        auth: {
          status: 'authenticated',
          userId: data.user.id,
          email: data.user.email,
          cookies: manualCookieCheck
        }
      });
      
    } catch (error) {
      return NextResponse.json({
        ...debugInfo,
        auth: {
          status: 'error',
          message: 'Error checking authentication',
          error: (error as Error)?.message || String(error),
          cookies: manualCookieCheck
        }
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Error processing debug request',
      error: (error as Error)?.message || String(error)
    }, { status: 500 });
  }
} 