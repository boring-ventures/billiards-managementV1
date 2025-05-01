import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const userId = (await params).userId;
    console.log("Fetching specific profile for user ID:", userId);

    // Create Supabase client with awaited cookies
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      console.error("Authentication error:", sessionError);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only allow users to view their own profile (or admin users to view any profile)
    const currentUser = session.user;
    console.log("Current user ID:", currentUser.id);
    
    try {
      const userProfile = await prisma.profile.findUnique({
        where: { userId: currentUser.id },
      });

      // Check if user is a superadmin based on metadata if no profile exists
      let isSuperadmin = userProfile?.role === "SUPERADMIN";
      if (!userProfile && currentUser.user_metadata?.role === "SUPERADMIN") {
        console.log("User has superadmin role in metadata");
        isSuperadmin = true;
      }

      if (userId !== currentUser.id && !isSuperadmin) {
        console.error("Unauthorized access attempt");
        return NextResponse.json(
          { error: "Unauthorized to view this profile" },
          { status: 403 }
        );
      }

      const profile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (!profile) {
        console.error("Profile not found for requested user ID:", userId);
        
        // Check if this is for current user and they're a superadmin without profile
        if (userId === currentUser.id && currentUser.user_metadata?.role === "SUPERADMIN") {
          console.log("Creating profile for superadmin user");
          
          // Create a minimal profile for superadmins
          const superadminProfile = await prisma.profile.create({
            data: {
              userId,
              firstName: currentUser.user_metadata?.firstName || currentUser.user_metadata?.first_name || null,
              lastName: currentUser.user_metadata?.lastName || currentUser.user_metadata?.last_name || null,
              avatarUrl: currentUser.user_metadata?.avatarUrl || currentUser.user_metadata?.avatar_url || null,
              role: "SUPERADMIN",
              active: true,
            },
          });
          
          return NextResponse.json({ profile: superadminProfile });
        }
        
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      return NextResponse.json({ profile });
    } catch (profileError) {
      console.error("Error processing user profile:", profileError);
      return NextResponse.json(
        { error: "Failed to process user profile" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    // Create Supabase client with awaited cookies
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Only allow users to update their own profile (or admin users to update any profile)
    const currentUser = session.user;
    const userProfile = await prisma.profile.findUnique({
      where: { userId: currentUser.id },
    });

    if (userId !== currentUser.id && userProfile?.role !== "SUPERADMIN") {
      return NextResponse.json(
        { error: "Unauthorized to update this profile" },
        { status: 403 }
      );
    }

    const json = await request.json();

    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        firstName: json.firstName || undefined,
        lastName: json.lastName || undefined,
        avatarUrl: json.avatarUrl || undefined,
        active: json.active !== undefined ? json.active : undefined,
      },
    });

    return NextResponse.json({ profile: updatedProfile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
