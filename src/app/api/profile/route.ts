import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import type { UserRole, Prisma } from "@prisma/client";

// GET: Fetch profile for the current authenticated user
export async function GET(_request: NextRequest) {
  try {
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

    const userId = session.user.id;
    console.log("Fetching profile for user ID:", userId);

    // Fetch profile from the database
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      console.error("Profile not found for user ID:", userId);
      
      // Check if this is a superadmin that might not have a profile
      // We can create a minimal profile for superadmins on-the-fly
      try {
        const userMetadata = session.user.user_metadata;
        const isSuperadmin = userMetadata?.role === "SUPERADMIN";
        
        if (isSuperadmin) {
          console.log("Creating minimal profile for superadmin user");
          
          // Create a minimal profile for superadmins
          const superadminProfile = await prisma.profile.create({
            data: {
              userId,
              firstName: userMetadata?.firstName || userMetadata?.first_name || null,
              lastName: userMetadata?.lastName || userMetadata?.last_name || null,
              avatarUrl: userMetadata?.avatarUrl || userMetadata?.avatar_url || null,
              role: "SUPERADMIN",
              active: true,
            },
          });
          
          return NextResponse.json(superadminProfile);
        }
      } catch (createError) {
        console.error("Error creating superadmin profile:", createError);
      }
      
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PUT: Update profile for the current authenticated user
export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current user's session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const data = await request.json();
    const { firstName, lastName, avatarUrl, active } = data;

    // Update profile in the database
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: {
        firstName,
        lastName,
        avatarUrl,
        active,
      },
    });

    return NextResponse.json(updatedProfile);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

// POST: Create a new profile for the current authenticated user
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { userId, firstName, lastName, avatarUrl } = data;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // If userId is provided directly (during signup flow)
    try {
      // Check if profile already exists
      const existingProfile = await prisma.profile.findUnique({
        where: { userId },
      });

      if (existingProfile) {
        return NextResponse.json(
          { error: "Profile already exists" },
          { status: 409 }
        );
      }

      // Create profile in the database
      const newProfile = await prisma.profile.create({
        data: {
          userId,
          firstName: firstName || null,
          lastName: lastName || null,
          avatarUrl: avatarUrl || null,
          role: "USER", // This field has a default in the schema but we set it explicitly
          active: true, // This field has a default in the schema but we set it explicitly
        },
      });

      return NextResponse.json(newProfile, { status: 201 });
    } catch (dbError) {
      console.error("Database error creating profile:", dbError);
      const errorMessage =
        dbError instanceof Error ? dbError.message : String(dbError);
      return NextResponse.json(
        { error: "Database error creating profile", details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in profile creation endpoint:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create profile", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function GETAll(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role");
    const active = searchParams.get("active");

    const whereClause: Prisma.ProfileWhereInput = {};

    if (role) whereClause.role = role as UserRole;
    if (active !== null) whereClause.active = active === "true";

    const profiles = await prisma.profile.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
