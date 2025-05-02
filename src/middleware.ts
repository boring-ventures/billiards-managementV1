import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Use the Experimental Edge Runtime for better performance
export const runtime = 'experimental-edge';

// Middleware to handle auth session and refreshing tokens
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Skip auth check for public routes and static assets
  if (
    req.nextUrl.pathname.startsWith("/auth/callback") ||
    req.nextUrl.pathname === "/terms" || 
    req.nextUrl.pathname === "/privacy" || 
    req.nextUrl.pathname === "/documentation" ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/static") ||
    req.nextUrl.pathname.startsWith("/api/") || // API routes handle their own auth
    req.nextUrl.pathname.includes(".") // Skip files with extensions
  ) {
    return res;
  }

  try {
    // Create a Supabase client for this request
    const supabase = createMiddlewareClient({ req, res });
    
    // Refresh session if expired - necessary for server components to work properly
    await supabase.auth.getUser();
    
    // Auth routes handling - use URL checks without additional auth checks
    if (
      req.nextUrl.pathname.startsWith("/sign-in") ||
      req.nextUrl.pathname.startsWith("/sign-up")
    ) {
      // Let the page handle whether to redirect authenticated users
      return res;
    }

    // Check for protected routes - simple pattern matching only
    // Let the actual page component handle detailed authorization
    if (
      req.nextUrl.pathname.startsWith("/dashboard") || 
      req.nextUrl.pathname.startsWith("/company-selection") || 
      req.nextUrl.pathname.startsWith("/waiting-approval")
    ) {
      // Return response as is - page will handle auth check
      return res;
    }
    
    // For all other routes, just pass through
    return res;
  } catch (error) {
    console.error("Error in middleware:", error);
    // Fall through to client-side auth on errors
    return res;
  }
}

export const config = {
  matcher: [
    // Use simple patterns instead of complex regex
    '/((?!_next/static|_next/image|favicon.ico|api|auth/callback).*)',
  ],
};
