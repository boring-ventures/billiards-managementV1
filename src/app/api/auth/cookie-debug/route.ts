import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Debug endpoint to check what cookies are available
 * This helps diagnose authentication issues without exposing sensitive data
 * IMPORTANT: Remove or secure this endpoint in production!
 */
export async function GET(request: NextRequest) {
  try {
    // Get all request cookies directly from the request
    const requestCookies = request.cookies.getAll();
    
    // Also check the headers
    const authHeader = request.headers.get('authorization');
    
    // Return cookie info without exposing values
    return NextResponse.json({
      cookies: {
        names: requestCookies.map(c => c.name),
        count: requestCookies.length,
        has_auth_token: requestCookies.some(c => 
          c.name === 'sb-auth-token' || 
          c.name === 'sb-refresh-token' ||
          c.name.startsWith('sb-')
        ),
      },
      headers: {
        has_auth_header: !!authHeader,
        auth_type: authHeader?.split(' ')?.[0] || null,
      },
      browser: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: "Error getting cookies", 
      message: error.message 
    }, { status: 500 });
  }
} 