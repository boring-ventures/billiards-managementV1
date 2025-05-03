import { NextResponse } from 'next/server';
import { debugServerCookies, createServerSupabaseClient, AUTH_TOKEN_KEY } from '@/lib/auth-utils';

export async function GET() {
  // This is only for debugging - REMOVE IN PRODUCTION
  const cookieDebugInfo = await debugServerCookies();
  
  // Attempt to get session info - standard way
  let sessionInfo = { error: 'Not attempted' };
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    sessionInfo = {
      hasSession: !!data.session,
      userId: data.session?.user?.id || null,
      sessionError: error?.message || null,
      accessToken: data.session?.access_token ? 'Present (truncated)' : null,
      tokenExpiry: data.session?.expires_at ? new Date(data.session.expires_at * 1000).toISOString() : null,
    };
  } catch (err: any) {
    sessionInfo = { error: err.message || 'Unknown error fetching session' };
  }
  
  // Check for auth cookie details
  let cookieValue = 'Not checked';
  let rawCookieInfo = {};
  
  try {
    if (typeof globalThis.process !== 'undefined') {
      // Only works in Node.js environment
      const { cookies } = require('next/headers');
      const cookieStore = cookies();
      const authCookie = cookieStore.get(AUTH_TOKEN_KEY);
      
      if (authCookie) {
        cookieValue = authCookie.value.substring(0, 20) + '...';
        rawCookieInfo = {
          name: authCookie.name,
          value: `${authCookie.value.substring(0, 10)}...`, // Show first 10 chars
          hasBase64Prefix: authCookie.value.startsWith('base64-'),
          length: authCookie.value.length,
        };
      } else {
        cookieValue = 'Cookie not found';
      }
    }
  } catch (e: any) {
    cookieValue = `Error checking: ${e.message}`;
  }
  
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) + '...',
    supabaseKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    timestamp: new Date().toISOString(),
    authCookie: {
      cookieValue,
      rawCookieInfo,
    },
    cookieInfo: cookieDebugInfo,
    sessionInfo,
    requestHeaders: {
      // Show common headers that could affect cookies
      userAgent: globalThis.headers?.get?.('user-agent')?.substring(0, 50) + '...' || 'Not available',
      host: globalThis.headers?.get?.('host') || 'Not available',
      referer: globalThis.headers?.get?.('referer') || 'Not available',
      // Add more headers as needed
    }
  });
} 