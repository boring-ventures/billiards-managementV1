import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

/**
 * Debug endpoint to check authentication status with detailed information
 * This helps diagnose authentication issues in different environments
 */
export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client using the SSR package
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value || null;
          },
          set() {
            // Server API routes don't need to set cookies
          },
          remove() {
            // Server API routes don't need to remove cookies
          }
        }
      }
    );

    // Check for session
    const { data, error } = await supabase.auth.getUser();
    
    // Capture cookies for debugging
    const cookieHeader = request.headers.get("cookie") || "";
    const allCookies = request.cookies.getAll();
    const cookieNames = allCookies.map(c => c.name);
    const authCookies = allCookies.filter(c => c.name.includes('auth'));
    
    return NextResponse.json({
      authenticated: !!data.user,
      user: data.user || null,
      error: error?.message || null,
      cookieCount: allCookies.length,
      cookieNames,
      authCookies: authCookies.map(c => ({ 
        name: c.name, 
        value: c.value.substring(0, 20) + '...' 
      })),
      headers: {
        cookie: cookieHeader.substring(0, 50) + '...',
        authorization: !!request.headers.get("authorization")
      }
    });
  } catch (e) {
    console.error("[API] Debug auth error:", e);
    return NextResponse.json(
      { error: "Failed to debug auth", detail: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
} 