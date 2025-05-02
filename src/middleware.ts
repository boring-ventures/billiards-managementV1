import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Use the Experimental Edge Runtime for better performance
export const runtime = 'experimental-edge';

// Middleware to handle auth session and refreshing tokens
export async function middleware(req: NextRequest) {
  // Skip auth check for public routes and static assets
  const { pathname } = req.nextUrl;
  
  // Skip authentication for public routes
  if (
    pathname.startsWith("/auth/callback") ||
    pathname === "/sign-in" ||
    pathname === "/sign-up" || 
    pathname === "/forgot-password" ||
    pathname === "/magic-link" ||
    pathname === "/terms" || 
    pathname === "/privacy" || 
    pathname === "/documentation" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/api/") || // API routes handle their own auth
    pathname.includes(".") // Skip files with extensions
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

// Update matcher pattern to comply with Next.js 15 requirements
// Avoid using complex capturing groups which are no longer supported
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
