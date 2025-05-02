import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Root middleware for Supabase authentication
 * This is the main entry point that Next.js will use for all routes
 */
export const runtime = 'experimental-edge';

// This function is executed for every request
export async function middleware(request: NextRequest) {
  console.log(`[Root Middleware] Processing request for ${request.nextUrl.pathname}`);
  
  // Skip static assets and auth-related endpoints to improve performance and prevent loops
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.startsWith('/auth/callback') ||
    request.nextUrl.pathname.startsWith('/auth/confirm') ||
    request.nextUrl.pathname.includes('.') ||
    request.nextUrl.pathname.startsWith('/favicon')
  ) {
    console.log(`[Root Middleware] Skipping middleware for: ${request.nextUrl.pathname}`);
    return NextResponse.next();
  }
  
  // If this is an API route with authorization header, let it pass through
  if (request.nextUrl.pathname.startsWith('/api/') && request.headers.has('authorization')) {
    console.log(`[Root Middleware] API route with auth header, skipping session update: ${request.nextUrl.pathname}`);
    return NextResponse.next();
  }
  
  console.log(`[Root Middleware] Running updateSession for: ${request.nextUrl.pathname}`);
  return await updateSession(request);
}

/**
 * Configure the middleware to run on specific paths
 * This ensures authentication is handled for all relevant routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
