import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { createOrUpdateUserProfile } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data } = await supabase.auth.exchangeCodeForSession(code);

    // Create user profile in Prisma if it doesn't exist and we have a session
    if (data?.session) {
      const userId = data.session.user.id;
      const user = data.session.user;
      console.log("[Auth:Callback] Processing user:", userId);

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
      } catch (error) {
        console.error("[Auth:Callback] Error creating profile:", error);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
