import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import type { UserRole, Prisma } from "@prisma/client";
import { auth, createOrUpdateUserProfile } from "@/lib/auth";

// GET: Fetch profile for the current authenticated user
export async function GET(request: NextRequest) {
  try {
    // Check if there's a userId query parameter (for compatibility with by-id endpoint)
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get("userId");
    
    if (userIdParam) {
      // Redirect to the by-id endpoint
      const byIdEndpoint = '/api/profile/by-id';
      const response = await fetch(`${new URL(request.url).origin}${byIdEndpoint}?userId=${userIdParam}`, {
        headers: {
          cookie: request.headers.get('cookie') || ''
        }
      });
      
      return response;
    }
    
    // Regular authentication flow for current user
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user - using getUser instead of getSession
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Not authenticated" },
        { status: 401 }
      );
    }

    const userId = data.user.id;
    
    // Check if we already have a profile
    let profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      // Use the centralized function to create a profile
      try {
        profile = await createOrUpdateUserProfile(
          userId,
          {
            ...data.user.user_metadata,
            email: data.user.email
          }
        );
      } catch (error) {
        console.error("Error creating profile:", error);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error in profile endpoint:", error);
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

    // Get the current user - using getUser instead of getSession
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = data.user.id;
    const requestData = await request.json();
    const { firstName, lastName, avatarUrl, active } = requestData;

    // Use the centralized function to update the profile
    try {
      const updatedProfile = await createOrUpdateUserProfile(
        userId,
        { firstName, lastName, avatarUrl },
        { active }
      );
      
      return NextResponse.json(updatedProfile);
    } catch (error) {
      console.error("Error updating profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }
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
    const { userId, firstName, lastName, avatarUrl, role } = data;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Use the centralized function to create the profile
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

      const newProfile = await createOrUpdateUserProfile(
        userId,
        { firstName, lastName, avatarUrl },
        { forcedRole: role as UserRole }
      );

      return NextResponse.json(newProfile, { status: 201 });
    } catch (error) {
      console.error("Database error creating profile:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
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
