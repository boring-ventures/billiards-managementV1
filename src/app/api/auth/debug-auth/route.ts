import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

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
    
    // Check for auth headers
    const authHeader = request.headers.get('authorization');
    const hasBearerToken = authHeader?.startsWith('Bearer ');
    
    // Get client info
    const clientInfo = {
      userAgent: request.headers.get('user-agent'),
      host: request.headers.get('host'),
      referer: request.headers.get('referer')
    };
    
    // Create Supabase client
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Try to get user session from both methods
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    // Prepare response based on what we found
    const authStatus = {
      timestamp: new Date().toISOString(),
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      authenticated: !!userData?.user,
      cookies: {
        present: cookieNames,
        count: cookieNames.length,
        has_auth_token: cookieNames.includes('sb-auth-token'),
        has_refresh_token: cookieNames.includes('sb-refresh-token')
      },
      headers: {
        has_auth_header: !!authHeader,
        auth_type: hasBearerToken ? 'Bearer' : (authHeader ? 'Other' : null),
      },
      session: {
        exists: !!sessionData?.session,
        error: sessionError ? sessionError.message : null,
        expires_at: sessionData?.session?.expires_at 
          ? new Date(sessionData?.session?.expires_at * 1000).toISOString() 
          : null
      },
      user: userData?.user ? {
        id: userData.user.id,
        email_masked: userData.user.email 
          ? `${userData.user.email.substring(0, 2)}****${userData.user.email.split('@')[1]}` 
          : null,
        has_metadata: !!userData.user.user_metadata && 
          Object.keys(userData.user.user_metadata).length > 0
      } : null,
      user_error: userError ? userError.message : null,
      client: clientInfo
    };
    
    return NextResponse.json(authStatus);
  } catch (error: any) {
    return NextResponse.json({
      error: "Failed to get authentication debug info",
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 