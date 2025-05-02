import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * API endpoint to check authentication status without exposing sensitive data
 * This is useful for debugging authentication issues in production
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Check for auth-related cookies
    const cookiesList = request.cookies.getAll();
    const hasAuthCookie = request.cookies.has('sb-auth-token');
    
    // Check if we have a session
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Auth Debug] Session error:', error.message);
      return NextResponse.json({
        authenticated: false,
        error: 'Session error',
        cookiesPresent: cookiesList.length > 0,
        hasAuthCookie,
        timestamp: new Date().toISOString(),
      });
    }
    
    if (!data.session) {
      return NextResponse.json({
        authenticated: false,
        reason: 'No session',
        cookiesPresent: cookiesList.length > 0,
        hasAuthCookie,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Get user info without exposing sensitive data
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError || !userData?.user) {
      return NextResponse.json({
        authenticated: false,
        reason: 'Invalid user',
        userError: userError?.message,
        cookiesPresent: cookiesList.length > 0,
        hasAuthCookie,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Return status with minimal user info
    return NextResponse.json({
      authenticated: true,
      userId: userData.user.id,
      email: userData.user.email ? `${userData.user.email.charAt(0)}...${userData.user.email.split('@')[1]}` : null,
      hasValidSession: !!data.session,
      sessionExpires: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Auth Debug] Error:', error);
    return NextResponse.json({
      authenticated: false,
      error: 'Server error',
      message: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
} 