import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Use the Edge Runtime for better performance
export const runtime = 'edge';

// Simplified middleware - only checks session existence
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
    req.nextUrl.pathname.startsWith("/api/") // API routes handle their own auth
  ) {
    return res;
  }

  // Get the Supabase client and check for session
  const supabase = createMiddlewareClient({ req, res });
  
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    // Auth routes handling
    if (
      session &&
      (req.nextUrl.pathname.startsWith("/sign-in") ||
       req.nextUrl.pathname.startsWith("/sign-up"))
    ) {
      // Redirect authenticated users away from auth pages
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }

    // Protect private routes
    if (
      !session && 
      (req.nextUrl.pathname.startsWith("/dashboard") || 
       req.nextUrl.pathname.startsWith("/company-selection") || 
       req.nextUrl.pathname.startsWith("/waiting-approval"))
    ) {
      // Redirect unauthenticated users to login
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/sign-in";
      redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Let client components handle detailed permission checks
    return res;
  } catch (error) {
    console.error("Error in middleware:", error);
    // Fall through to client-side auth on errors
    return res;
  }
}

export const config = {
  matcher: [
    // Skip static files, images and API routes in middleware matcher for performance
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(svg|png|jpg|jpeg|webp)|api/|auth/callback).*)",
  ],
};
