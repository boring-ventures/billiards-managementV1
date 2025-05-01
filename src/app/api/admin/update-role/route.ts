import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UserRole } from "@prisma/client";

// This endpoint allows updating a user's role by a superadmin
export async function POST(request: NextRequest) {
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
        { error: "Forbidden: Only superadmins can update user roles" },
        { status: 403 }
      );
    }

    // Parse request
    const { userId, role, updateMetadata = false } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: "Invalid request: userId and role are required" },
        { status: 400 }
      );
    }

    console.log(`[API:admin] Updating user ${userId} to role ${role}`);

    // Check if valid role
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json(
        { error: `Invalid role: ${role}. Valid roles are: ${Object.values(UserRole).join(", ")}` },
        { status: 400 }
      );
    }

    // Get the user to verify they exist
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: `User not found: ${userError?.message || "User does not exist"}` },
        { status: 404 }
      );
    }

    // Update user role in profile database
    const updatedProfile = await prisma.profile.upsert({
      where: { userId },
      update: { 
        role: role as UserRole,
        // If updating to SUPERADMIN, ensure the account is active
        active: role === UserRole.SUPERADMIN ? true : undefined
      },
      create: {
        userId,
        role: role as UserRole,
        active: true,
        firstName: user.user.user_metadata?.firstName || user.user.user_metadata?.first_name || null,
        lastName: user.user.user_metadata?.lastName || user.user.user_metadata?.last_name || null,
      },
    });

    // Optionally update the Supabase user metadata
    if (updateMetadata) {
      await supabase.auth.admin.updateUserById(
        userId,
        { 
          user_metadata: { 
            ...user.user.user_metadata,
            role,
          } 
        }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `User role updated to ${role}`,
      profile: updatedProfile
    });
    
  } catch (error) {
    console.error("[API:admin] Error updating user role:", error);
    return NextResponse.json(
      { error: "Failed to update user role", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 