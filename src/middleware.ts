import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Use the Experimental Edge Runtime for better performance
export const runtime = 'experimental-edge';

// Matcher for routes that should be protected and go through the middleware
export const config = {
  matcher: [
    // Auth routes
    '/auth/callback',
    
    // Protected routes that need auth check
    '/dashboard/:path*',
    '/company-selection',
    '/waiting-approval',
    
    // API routes that need auth
    '/api/:path*',
  ]
};

// Middleware function that runs on every request
export default async function middleware(request: NextRequest) {
  // Always run session refresh for all routes
  return await updateSession(request);
}
