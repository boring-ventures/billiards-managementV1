import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Use the Experimental Edge Runtime for better performance
export const runtime = 'experimental-edge';

// Middleware to handle auth session and refreshing tokens
export async function middleware(req: NextRequest) {
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
    return NextResponse.next();
  }

  try {
    // Use the updateSession helper to refresh the auth token
    // This will handle cookie management and token refresh
    return await updateSession(req);
  } catch (error) {
    console.error("Error in middleware:", error);
    // Fall through to client-side auth on errors
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    // Use simple patterns instead of complex regex
    '/((?!_next/static|_next/image|favicon.ico|api|auth/callback).*)',
  ],
};
