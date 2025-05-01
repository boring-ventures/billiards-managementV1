import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

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

      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (!existingProfile) {
        console.log("[Auth:Callback] Creating new profile");
        
        // Extract user metadata
        const userMetadata = user.user_metadata || {};
        
        // Check if superadmin
        const isSuperadmin = 
          userMetadata.role === "SUPERADMIN" || 
          userMetadata.isSuperAdmin === true ||
          (typeof userMetadata.is_superadmin === 'boolean' && userMetadata.is_superadmin);
        
        // Extract name from email if not in metadata
        const emailName = user.email ? user.email.split('@')[0] : null;
        const emailNameParts = emailName ? emailName.split('.') : [];
        
        // Get first and last name with fallbacks
        const firstName = 
          userMetadata.firstName || 
          userMetadata.first_name || 
          userMetadata.given_name ||
          userMetadata.name?.split(' ')[0] || 
          (emailNameParts.length > 0 ? 
            emailNameParts[0].charAt(0).toUpperCase() + emailNameParts[0].slice(1) : 
            (user.email ? user.email.split('@')[0] : "User"));
        
        const lastName = 
          userMetadata.lastName || 
          userMetadata.last_name || 
          userMetadata.family_name || 
          userMetadata.name?.split(' ').slice(1).join(' ') || 
          (emailNameParts.length > 1 ? 
            emailNameParts[1].charAt(0).toUpperCase() + emailNameParts[1].slice(1) : "");
        
        console.log("[Auth:Callback] Creating profile with name:", firstName, lastName);
        
        await prisma.profile.create({
          data: {
            userId,
            firstName,
            lastName,
            avatarUrl: userMetadata.avatarUrl || userMetadata.avatar_url || null,
            role: isSuperadmin ? UserRole.SUPERADMIN : UserRole.USER,
            active: true,
          },
        });
        
        console.log("[Auth:Callback] Profile created successfully");
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
