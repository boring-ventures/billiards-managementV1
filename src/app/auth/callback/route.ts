import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createOrUpdateUserProfile } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    
    // If code is missing, redirect to sign-in
    if (!code) {
      console.error("[Auth:Callback] No code parameter found");
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    
    // Get the cookies and create a route handler client
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Exchange the code for a session with proper error handling
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error || !data?.session) {
      console.error("[Auth:Callback] Error exchanging code for session:", error);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
    
    // We now have a valid session
    const userId = data.session.user.id;
    const user = data.session.user;
    console.log("[Auth:Callback] Successfully authenticated user:", userId);

    try {
      // Check if profile already exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (!existingProfile) {
        console.log("[Auth:Callback] Creating new profile");
        
        // Use the centralized function to create a profile
        await createOrUpdateUserProfile(
          userId,
          {
            ...user.user_metadata,
            email: user.email
          }
        );
        
        console.log("[Auth:Callback] Profile created successfully");
      }
      
      // Create a response with the appropriate redirect
      const response = NextResponse.redirect(new URL("/dashboard", request.url));
      
      // Set session cookie to maximum age (default 2 weeks) to ensure it persists
      // All this is handled by supabase automatically, but we can explicitly
      // ensure response headers are properly set
      
      return response;
    } catch (error) {
      console.error("[Auth:Callback] Error processing authenticated user:", error);
      // Even if there was an error creating the profile, redirect to dashboard
      // The dashboard will handle creating the profile if needed
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch (generalError) {
    console.error("[Auth:Callback] Unexpected error:", generalError);
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
}
