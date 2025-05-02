import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

// Helper function to get user profile from Supabase session
async function getUserProfile(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      return { session: null, profile: null };
    }

    // Get user profile info from the API
    const userId = session.user.id;
    
    // We need to use a relative URL that will work in all environments
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : process.env.NEXT_PUBLIC_APP_URL || '';
    
    // Make a server-side request to our own API to get the profile data
    const profileResponse = await fetch(`${baseUrl}/api/profile?userId=${userId}`, {
      headers: {
        Cookie: req.headers.get('cookie') || '',
      },
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      return { 
        session, 
        profile: profileData.profile || profileData 
      };
    }

    // Return session but no profile if the API request fails
    return { session, profile: null };
  } catch (error) {
    console.error("Error in middleware:", error);
    return { session: null, profile: null };
  }
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Skip auth check for public routes
  if (
    req.nextUrl.pathname.startsWith("/auth/callback") ||
    req.nextUrl.pathname === "/terms" || 
    req.nextUrl.pathname === "/privacy" || 
    req.nextUrl.pathname === "/documentation" ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/api/") // API routes handle their own auth
  ) {
    return res;
  }

  // Get user session and profile
  const { session, profile } = await getUserProfile(req);

  // If there's no session and the user is trying to access a protected route
  if (!session && 
    (req.nextUrl.pathname.startsWith("/dashboard") || 
     req.nextUrl.pathname.startsWith("/company-selection") || 
     req.nextUrl.pathname.startsWith("/waiting-approval"))
  ) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If there's a session and the user is trying to access auth routes
  if (
    session &&
    (req.nextUrl.pathname.startsWith("/sign-in") ||
     req.nextUrl.pathname.startsWith("/sign-up"))
  ) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    return NextResponse.redirect(redirectUrl);
  }

  // Role-based access control for dashboard
  if (session && profile && req.nextUrl.pathname.startsWith("/dashboard")) {
    const role = profile.role;
    const companyId = profile.companyId;

    // If user is not SUPERADMIN and has no company assigned, redirect to waiting page
    if (role !== UserRole.SUPERADMIN && !companyId && req.nextUrl.pathname !== "/waiting-approval") {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/waiting-approval";
      return NextResponse.redirect(redirectUrl);
    }

    // SUPERADMIN specific route check
    if (role !== UserRole.SUPERADMIN && req.nextUrl.pathname.startsWith("/dashboard/admin")) {
      // Non-superadmins trying to access superadmin routes
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }

    // SUPERADMIN with no company selected should be redirected to company selection
    if (role === UserRole.SUPERADMIN && !companyId && req.nextUrl.pathname !== "/company-selection") {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/company-selection";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
