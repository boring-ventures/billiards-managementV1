import { NextResponse } from 'next/server';

export async function GET() {
  // This is only for debugging - REMOVE IN PRODUCTION
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) + '...',
    supabaseKeyExists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
} 