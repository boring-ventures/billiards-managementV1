import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Use the Experimental Edge Runtime for better performance
export const runtime = 'experimental-edge';

// This function is executed for every request
export async function middleware(request: NextRequest) {
  console.log(`[Root Middleware] Processing ${request.method} request for: ${request.nextUrl.pathname}`);
  
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

// Matcher configuration to specify which paths this middleware will run on
export const config = {
  matcher: [
    // Exclude static files, images, and favicon
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
