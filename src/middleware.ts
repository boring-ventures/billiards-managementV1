import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Skip auth check for the auth callback route
  if (req.nextUrl.pathname.startsWith("/auth/callback")) {
    return res;
  }

  // If there's no session and the user is trying to access a protected route
  if (!session && 
     (req.nextUrl.pathname.startsWith("/dashboard") || 
      req.nextUrl.pathname.startsWith("/select-company") || 
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

  // The company selection and waiting page flow are handled client-side
  // in the individual page components to get access to the profile data

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/sign-in", 
    "/sign-up", 
    "/auth/callback", 
    "/select-company",
    "/waiting-approval"
  ],
};
