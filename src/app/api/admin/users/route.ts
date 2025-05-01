import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET: Fetch all users with their profiles (for admin)
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if requester is a superadmin
    const requesterId = session.user.id;
    const requesterProfile = await prisma.profile.findUnique({
      where: { userId: requesterId },
    });

    // Verify the requester is a superadmin
    const isSuperAdmin = requesterProfile && (
      requesterProfile.role === "SUPERADMIN" || 
      String(requesterProfile.role).toUpperCase() === "SUPERADMIN"
    );

    if (!isSuperAdmin) {
      return NextResponse.json(
        { error: "Forbidden: Only superadmins can access user list" },
        { status: 403 }
      );
    }

    // Fetch all users from Supabase
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100, // Adjust as needed
    });

    if (usersError) {
      return NextResponse.json(
        { error: "Failed to fetch users from Supabase", details: usersError.message },
        { status: 500 }
      );
    }

    if (!users) {
      return NextResponse.json({ users: [] });
    }

    // Get all user IDs
    const userIds = users.map(user => user.id);

    // Fetch all profiles in a single query to reduce database load
    const profiles = await prisma.profile.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    // Create a map of userId to profile for quick lookups
    const profilesMap = profiles.reduce((acc, profile) => {
      acc[profile.userId] = profile;
      return acc;
    }, {} as Record<string, typeof profiles[number]>);

    // Format the user data with profiles
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at,
      metadata: user.user_metadata,
      profile: profilesMap[user.id] || null,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("[API:admin:users] Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 