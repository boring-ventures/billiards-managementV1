import { NextResponse } from 'next/server';
import { debugServerCookies, createServerSupabaseClient } from '@/lib/auth-utils';

export async function GET() {
  // This is only for debugging - REMOVE IN PRODUCTION
  const cookieDebugInfo = await debugServerCookies();
  
  // Attempt to get session info
  let sessionInfo: any = { error: 'Not attempted' };
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getSession();
    sessionInfo = {
      hasSession: !!data.session,
      userId: data.session?.user?.id || null,
      sessionError: error?.message || null,
    };
  } catch (err: any) {
    sessionInfo = { error: err.message || 'Unknown error fetching session' };
  }
  
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) + '...',
    supabaseKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    cookieInfo: cookieDebugInfo,
    sessionInfo,
  });
} 