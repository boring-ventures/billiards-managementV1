import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

/**
 * GET: Fetch a user's profile by userId
 * Endpoint: /api/profile/by-id?userId={userId}
 * Used for superadmin user switching
 */
export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
    }

    console.log("[API:byId] Fetching profile for user ID:", userId);

    // Get the current user session
    const supabase = createRouteHandlerClient({ cookies });
    const sessionResult = await supabase.auth.getSession();
    
    if (!sessionResult?.data?.session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const currentUserId = sessionResult.data.session.user.id;
    
    // Fetch the current user's profile to check permissions
    const userProfile = await prisma.profile.findUnique({
      where: { userId: currentUserId },
    });

    // Check if user is a superadmin or looking at their own profile
    const isSuperadmin = userProfile?.role === "SUPERADMIN";
    const isOwnProfile = userId === currentUserId;
    
    if (!isSuperadmin && !isOwnProfile) {
      return NextResponse.json({ error: "Unauthorized to access this profile" }, { status: 403 });
    }

    // Fetch the requested profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Return the profile data
    return NextResponse.json({ profile });

  } catch (error) {
    console.error("[API:byId] Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
} 